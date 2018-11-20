use futures::compat::Future01CompatExt;
use futures::future::{FutureExt, FutureObj, TryFutureExt};
use futures::select;
use serde_json;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio_io::io::{read_until, write_all};
use tokio_process::*;
use tokio_timer::sleep;

use crate::container::ContainerHandle;
use crate::error::Error;
use crate::request::{Backend, Request, Response, Version};

#[derive(Debug)]
pub struct RendererMeta {
    pub id: i8,
    pub version: Version,
    pub image: String,
    pub timeout: u64,
}

#[derive(Debug)]
pub struct ReadyRenderContainer {
    pub meta: RendererMeta,
    container: ContainerHandle,
    child: Child,
}

static LILYPOND_INCLUDES: &'static [&'static str] = &[
    "Welcome-to-LilyPond-MacOS.ly",
    "Welcome_to_LilyPond.ly",
    "arabic.ly",
    "articulate.ly",
    "bagpipe.ly",
    "base-tkit.ly",
    "catalan.ly",
    "chord-modifiers-init.ly",
    "chord-repetition-init.ly",
    "context-mods-init.ly",
    "declarations-init.ly",
    "deutsch.ly",
    "drumpitch-init.ly",
    "dynamic-scripts-init.ly",
    "english.ly",
    "engraver-init.ly",
    "espanol.ly",
    "event-listener.ly",
    "festival.ly",
    "generate-documentation.ly",
    "generate-interface-doc-init.ly",
    "grace-init.ly",
    "graphviz-init.ly",
    "gregorian.ly",
    "guile-debugger.ly",
    "hel-arabic.ly",
    "init.ly",
    "italiano.ly",
    "lilypond-book-preamble.ly",
    "lyrics-tkit.ly",
    "makam.ly",
    "midi-init.ly",
    "music-functions-init.ly",
    "nederlands.ly",
    "norsk.ly",
    "paper-defaults-init.ly",
    "performer-init.ly",
    "piano-tkit.ly",
    "portugues.ly",
    "predefined-fretboards-init.ly",
    "predefined-guitar-fretboards.ly",
    "predefined-guitar-ninth-fretboards.ly",
    "predefined-mandolin-fretboards.ly",
    "predefined-ukulele-fretboards.ly",
    "property-init.ly",
    "satb.ly",
    "scale-definitions-init.ly",
    "scheme-sandbox.ly",
    "script-init.ly",
    "spanners-init.ly",
    "ssaattbb.ly",
    "staff-tkit.ly",
    "string-tunings-init.ly",
    "suomi.ly",
    "svenska.ly",
    "text-replacements.ly",
    "titling-init.ly",
    "toc-init.ly",
    "vlaams.ly",
    "vocal-tkit.ly",
    "voice-tkit.ly",
];

/**
 * Actually process the request.
 *
 * Writes a JSON line request to the container, and reads a JSON line response.
 *
 * On failure, the container must be stopped downstream.
 *
 * The timeout is done in try_handle_request, which calls this function.
 * The response is split into coordinator-oriented and request-oriented responses in handle_request
 */
async fn handle_request_impl(
    mut child: Child,
    mut request: Request,
) -> Result<(Child, String), Error> {
    // Write the request to stdin.
    match child.stdin() {
        Some(stdin) => {
            if request.backend == Backend::Svg {
                request.src = "#(ly:set-option 'backend 'svg)\n".to_owned() + &request.src;
            } else if request.backend == Backend::Pdf {
                request.src = "\n".to_owned() + &request.src;
            }

            // HACK: lys doesn't handle global includes, so lets handle them ourselves by
            // outsmarting their regex.
            for include in LILYPOND_INCLUDES {
                let to_replace = "\\include \"".to_owned() + &include + &"\"";
                if request.src.contains(&to_replace) {
                    let replace_with = "\\include  \"".to_owned() + &include + &"\"";
                    request.src = request.src.replace(&to_replace, &replace_with);
                }
            }

            let request_json = serde_json::to_string(&request)
                .or_else(|err| Err(Error::RenderError(err.to_string())))?;
            info!("Received request");
            debug!("Request {}", request_json);
            // TODO: assert no \n
            let request_bytes = (request_json + "\n").into_bytes();

            await!(write_all(stdin, request_bytes)).or_else(|err| {
                Err(Error::RenderError(
                    "Internal error: could not write bytes to container: ".to_owned()
                        + &err.to_string(),
                ))
            })?;
        }
        None => Err(Error::RenderError(
            "Internal error: child is missing stdin".to_owned(),
        ))?,
    }

    // Read the result from stdout.
    let response_line = match child.stdout() {
        Some(stdout) => {
            let stdout = BufReader::new(stdout);

            let (_reader, response_bytes) =
                await!(read_until(stdout, b'\n', Vec::new())).or_else(|err| {
                    Err(Error::RenderError(
                        "Internal error: could not read bytes from container: ".to_owned()
                            + &err.to_string(),
                    ))
                })?;

            String::from_utf8(response_bytes).or_else(|err| {
                Err(Error::RenderError(
                    "Internal error: read non-utf8 bytes from container: ".to_owned()
                        + &err.to_string(),
                ))
            })?
        }
        None => Err(Error::RenderError(
            "Internal error: child is missing stdout".to_owned(),
        ))?,
    };

    Ok((child, response_line))
}

/**
 * Wrapper around handle_request_impl, that checks for a timeout.
 *
 * On failure, the container must be stopped downstream.
 *
 * Note that the container itself has its own timeout mechanism that doesn't eventually involve
 * stopping the container on failure.
 *
 * The response is split into coordinator-oriented and request-oriented responses in handle_request.
 */
async fn try_handle_request(
    child: Child,
    request: Request,
    timeout: Duration,
) -> Result<(Child, String), Error> {
    let mut response = Box::pinned(handle_request_impl(child, request));
    let mut timeout = sleep(timeout).compat();

    select! {
        response => response,
        timeout => Err(Error::RenderError("Timeout: the container is unresponsive".to_owned())),
    }
}

impl ReadyRenderContainer {
    /**
     * Perform a request, consuming the ReadyRenderContainer.
     *
     * Returns a tuple, with two items:
     *  - a RenderContainer, which will be in the Busy state. container.next() will resolve when the
     *    request is complete. It will either result to the Ready or Error state, depending on
     *    whether the container is still running or not. If the result is in the Error state, the
     *    container MUST be terminated by calling "next" on it.
     *  - a future for the result, which can be sent back to the requestor.
     */
    pub fn handle_request(
        self,
        request: Request,
        timeout: Duration,
    ) -> (RenderContainer, FutureObj<'static, Response>) {
        // The actual processing is done in handle_request_impl, which is called by try_handle_request.
        let result = try_handle_request(self.child, request, timeout)
            .map_ok(|res| (Arc::new(Mutex::new(Option::Some(res.0))), res.1))
            .boxed()
            .shared();

        // The rest of this function pushes data around and massages the return type to have
        // container-oriented and requester-oriented values.

        let result_copy = result.clone().compat();
        let child = async move {
            // If the result resolves to an Err, we'll resolve to that error
            Ok(await!(result_copy)?
                // Otherwise, retrieve the child we stored in the map_ok above. We can do this
                // exactly once.
                .0
                .lock()
                .expect("This closure is the only consumer of this mutex.")
                .take()
                .expect("This closure should only be called once."))
        };

        let result_copy = result.compat();
        let extract_result = async move {
            match await!(result_copy) {
                Ok(result_copy) => match serde_json::from_str(&result_copy.1) {
                    Ok(result_copy) => result_copy,
                    Err(err) => Response {
                        files: vec![],
                        // TODO: in this case, we should kill the renderer!
                        logs: "Could not parse response: ".to_owned() + &err.to_string(),
                        midi: "".to_owned(),
                    },
                },
                Err(err) => Response {
                    files: vec![],
                    logs: "Could not render file: ".to_owned() + &err.to_string(),
                    midi: "".to_owned(),
                },
            }
        };

        (
            RenderContainer::Busy(self.meta, self.container, FutureObj::new(Box::new(child))),
            FutureObj::new(Box::new(extract_result)),
        )
    }

    /**
     * Take stderr. This only returns something the first time it's called.
     *
     * stderr isn't used for resolving requests.
     */
    pub fn take_stderr(&mut self) -> Option<ChildStderr> {
        self.child.stderr().take()
    }
}

/**
 * A finate state machine for the containers.
 */
#[derive(Debug)]
pub enum RenderContainer {
    Creating(
        RendererMeta,
        FutureObj<'static, Result<(ContainerHandle, Child), Error>>,
    ),
    Busy(
        RendererMeta,
        ContainerHandle,
        FutureObj<'static, Result<Child, Error>>,
    ),
    Ready(ReadyRenderContainer),
    Dead(RendererMeta, Error),
    Stopped(RendererMeta),
}

/**
 * States that are not transient.
 */
#[derive(Debug)]
pub enum TerminalRenderContainer {
    Ready(ReadyRenderContainer),
    Dead(RendererMeta, Error),
    Stopped(RendererMeta),
}

impl RenderContainer {
    pub fn new(meta: RendererMeta) -> RenderContainer {
        let image = meta.image.to_owned();

        RenderContainer::Creating(
            meta,
            FutureObj::new(Box::new(ContainerHandle::create(image))),
        )
    }

    pub fn is_terminal(&self) -> bool {
        match &self {
            RenderContainer::Ready(_) => true,
            RenderContainer::Dead(_, _) => true,
            RenderContainer::Stopped(_) => true,

            RenderContainer::Creating(_, _) => false,
            RenderContainer::Busy(_, _, _) => false,
        }
    }

    pub async fn next(self) -> RenderContainer {
        match self {
            RenderContainer::Creating(meta, next) => match await!(next) {
                Ok((container, child)) => RenderContainer::Ready(ReadyRenderContainer {
                    meta,
                    container,
                    child,
                }),
                Err(err) => RenderContainer::Dead(meta, err),
            },
            RenderContainer::Busy(meta, mut container, next) => match await!(next) {
                Ok(child) => RenderContainer::Ready(ReadyRenderContainer {
                    meta,
                    container,
                    child,
                }),
                Err(err) => {
                    if let Err(e) = await!(container.close()) {
                        error!(
                            "Something went wrong -- could not close docker container: {}",
                            e
                        );
                    }
                    RenderContainer::Dead(meta, err)
                }
            },
            RenderContainer::Ready(ready_render_container) => {
                RenderContainer::Ready(ready_render_container)
            }
            RenderContainer::Dead(meta, error) => RenderContainer::Dead(meta, error),
            RenderContainer::Stopped(meta) => RenderContainer::Stopped(meta),
        }
    }

    pub async fn next_terminal(self) -> TerminalRenderContainer {
        let mut renderer = self;
        while !renderer.is_terminal() {
            renderer = await!(renderer.next());
        }

        match renderer {
            RenderContainer::Ready(r) => TerminalRenderContainer::Ready(r),
            RenderContainer::Dead(meta, err) => TerminalRenderContainer::Dead(meta, err),
            RenderContainer::Stopped(meta) => TerminalRenderContainer::Stopped(meta),
            _ => {
                panic!("Expected a terminal state.");
            }
        }
    }

    pub async fn terminate(self) -> RenderContainer {
        match await!(self.next_terminal()) {
            TerminalRenderContainer::Ready(render_container) => {
                let mut x = render_container.container;
                if let Err(e) = await!(x.close()) {
                    error!(
                        "Something went wrong -- could not close docker container: {}",
                        e
                    );
                }

                RenderContainer::Stopped(render_container.meta)
            }
            TerminalRenderContainer::Dead(meta, _) => RenderContainer::Stopped(meta),
            TerminalRenderContainer::Stopped(meta) => RenderContainer::Stopped(meta),
        }
    }
}
