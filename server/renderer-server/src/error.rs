use std::error;
use std::fmt;

#[derive(Debug, Clone)]
pub enum Error {
    ContainerInitError(String),
    RenderError(String),
    RenderPanic,
    CommandSourceError(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Error::ContainerInitError(reason) => write!(
                f,
                "Something went wrong while creating the render container: {}",
                reason
            ),
            Error::RenderError(reason) => write!(f, "Crashed during render: {}", reason),
            Error::RenderPanic => write!(f, "Render panic"),
            Error::CommandSourceError(reason) => write!(f, "Command source error: {}", reason),
        }
    }
}

impl error::Error for Error {
    fn description(&self) -> &str {
        match self {
            Error::ContainerInitError(_reason) => {
                "Something went wrong while creating the render container."
            }
            Error::RenderError(_reason) => "Crashed during render",
            Error::RenderPanic => "Render panic",
            Error::CommandSourceError(_reason) => "Command source error",
        }
    }

    fn cause(&self) -> Option<&error::Error> {
        // Generic error, underlying cause isn't tracked.
        None
    }
}
