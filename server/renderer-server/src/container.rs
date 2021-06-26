/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2018 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
use std::os::unix::process::ExitStatusExt;
use std::process::Stdio;
use std::time::Duration;

use rand::Rng;
use tokio::process::{Child, Command};
use tokio::time::delay_for;

use crate::error::HacklilyError;

/**
 * Detach the current process, and do not forward signals.
 *
 * We need to manage Docker containers ourselves, since they are not cleaned up automatically.
 * This allows us to manually control the signals the docker container actually gets.
 */
fn do_not_forward_sigs() -> Result<(), std::io::Error> {
    // We would like to be able to terminate these ourselves.
    let pid = nix::unistd::getpid();
    nix::unistd::setpgid(pid, pid).expect(
        "Cannot safely clean up docker containers, so bailing. It's up to you to clean up.",
    );
    unsafe {
        libc::signal(libc::SIGINT, libc::SIG_DFL);
        libc::signal(libc::SIGQUIT, libc::SIG_DFL);
        libc::signal(libc::SIGTSTP, libc::SIG_DFL);
        libc::signal(libc::SIGTTIN, libc::SIG_DFL);
        libc::signal(libc::SIGTTOU, libc::SIG_DFL);
    }
    Result::Ok(())
}

#[derive(Debug)]
pub struct ContainerHandle {
    id: String,
    alive: bool,
}

fn random_between(min: u64, max: u64) -> u64 {
    let mut rng = rand::thread_rng();
    rng.gen::<u64>() % (max - min)
}

impl ContainerHandle {
    #[must_use]
    pub async fn create(image: String) -> Result<(ContainerHandle, Child), HacklilyError> {
        let max_tries: u8 = 2;
        for _ in 0..max_tries {
            debug!("creating container with image {}", image);

            let mut create = Command::new("docker");
            let create = create
                .args(&[
                    "create",
                    "--rm",
                    "-i",
                    "--net=none",
                    "-m1g",
                    "--security-opt=no-new-privileges",
                    "--cap-drop",
                    "ALL",
                    "--kernel-memory=40M",
                    "--pids-limit=200",
                    "--cpus=1",
                    &image,
                ])
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            let create = unsafe { create.pre_exec(do_not_forward_sigs) };
            let create_output = create
                .output()
                .await
                .or_else(|err| Err(HacklilyError::ContainerInitError(err.to_string())))?;

            let container_id = String::from_utf8_lossy(&create_output.stdout)
                .trim()
                .to_string();

            let create_output_stderr = String::from_utf8_lossy(&create_output.stderr)
                .trim()
                .to_string();
            if create_output_stderr != "" {
                warn!("docker create stderr: {}", &create_output_stderr);
            }

            if !create_output.status.success() || container_id == "" {
                let mut err_msg = "Could not create docker container: ".to_owned();
                err_msg.push_str(&create_output_stderr);

                error!("docker init failure: {:?}", &err_msg);
                error!("Status {:?}", create_output.status);
                error!("Stderr {:?}", &create_output_stderr);
                error!("CID {:?}", &container_id);

                if let Some(code) = create_output.status.signal() {
                    if code == 4 {
                        // SIGILL
                        // This is a transisent error :(
                        let timeout = Duration::from_millis(random_between(200, 600));
                        error!("Transient error -- retrying in {:?}", timeout);
                        delay_for(timeout).await;
                        continue;
                    }
                }

                Err(HacklilyError::ContainerInitError(err_msg))?;
            }

            info!(
                "created container with ID {} (image={})",
                &container_id, &image
            );

            let handle = ContainerHandle {
                id: container_id,
                alive: true,
            };

            handle.start().await?;

            let child = handle.attach()?;

            return Ok((handle, child));
        }

        Err(HacklilyError::ContainerInitError(
            "Could not create container, even after multiple tries".to_owned(),
        ))?
    }

    #[must_use]
    async fn start(&self) -> Result<(), HacklilyError> {
        debug!("starting container with ID {}", &self.id);

        let mut start = Command::new("docker");
        let start = start
            .args(&["start", &self.id])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let start = unsafe { start.pre_exec(do_not_forward_sigs) };
        let start_output = start.output().await;

        match start_output {
            Ok(output) => {
                let stop_output_err = String::from_utf8_lossy(&output.stderr).trim().to_string();
                if stop_output_err != "" {
                    warn!(
                        "starting container with ID {}: {}",
                        &self.id, stop_output_err
                    );
                }
            }
            Err(err) => {
                error!("failed to start container with ID {}: {}", &self.id, err);
            }
        }

        Ok(())
    }

    #[must_use]
    fn attach(&self) -> Result<Child, HacklilyError> {
        debug!("attaching container with ID {}", &self.id);

        let mut child = Command::new("docker");
        let child = child
            .args(&["attach", "--sig-proxy=false", &self.id])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let child = unsafe { child.pre_exec(do_not_forward_sigs) };
        let child = child
            .spawn()
            .or_else(|err| Err(HacklilyError::ContainerInitError(err.to_string())))?;

        Ok(child)
    }

    pub async fn close(&mut self) -> Result<(), HacklilyError> {
        self.alive = false;

        info!("closing container with ID {}", &self.id);
        _close_container(self.id.to_owned()).await
    }
}

impl Drop for ContainerHandle {
    fn drop(&mut self) {
        if self.alive {
            let container_id = self.id.clone();
            error!(
                "Dropping live container with ID {}. This should have been closed manually!",
                &self.id
            );

            // NOTE: panics will not be handled in this cleanup.
            tokio::spawn(async move {
                _close_container(container_id)
                    .await
                    .expect("Could not close dropped container.");
            });
        }
    }
}

async fn _close_container(container_id: String) -> Result<(), HacklilyError> {
    let mut rm = Command::new("docker");
    let rm = rm
        .args(&["rm", "-f", &container_id])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    let rm = unsafe { rm.pre_exec(do_not_forward_sigs) };
    let rm_output = rm.output().await;

    match rm_output {
        Ok(output) => {
            let stop_output_err = String::from_utf8_lossy(&output.stderr).trim().to_string();
            if stop_output_err != "" {
                warn!(
                    "removed container with ID {}: {}",
                    &container_id, stop_output_err
                );
            }
        }
        Err(err) => {
            error!(
                "failed to remove container with ID {}: {}",
                &container_id, err
            );
        }
    }

    Ok(())
}
