use std::error::Error;
use std::fmt;

#[derive(Debug, Clone)]
pub enum HacklilyError {
    ContainerInitError(String),
    RenderError(String),
    RenderPanic,
    CommandSourceError(String),
}

impl fmt::Display for HacklilyError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            HacklilyError::ContainerInitError(reason) => write!(
                f,
                "Something went wrong while creating the render container: {}",
                reason
            ),
            HacklilyError::RenderError(reason) => write!(f, "Crashed during render: {}", reason),
            HacklilyError::RenderPanic => write!(f, "Render panic"),
            HacklilyError::CommandSourceError(reason) => {
                write!(f, "Command source error: {}", reason)
            }
        }
    }
}

impl Error for HacklilyError {
    fn description(&self) -> &str {
        match self {
            HacklilyError::ContainerInitError(_reason) => {
                "Something went wrong while creating the render container."
            }
            HacklilyError::RenderError(_reason) => "Crashed during render",
            HacklilyError::RenderPanic => "Render panic",
            HacklilyError::CommandSourceError(_reason) => "Command source error",
        }
    }

    fn cause(&self) -> Option<&dyn Error> {
        // Generic error, underlying cause isn't tracked.
        None
    }
}
