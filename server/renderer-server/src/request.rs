use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Copy, Clone)]
#[serde(rename_all = "camelCase")]
pub enum Backend {
    Svg,
    Pdf,
    #[serde(rename = "musicxml2ly")]
    MusicXml2Ly,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Copy, Clone)]
#[serde(rename_all = "camelCase")]
pub enum Version {
    Stable,
    Unstable,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
pub struct Request {
    pub id: String,
    pub backend: Backend,
    pub version: Version,
    pub src: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
pub struct Response {
    pub files: Vec<String>,
    pub logs: String,
    // in base64
    pub midi: String,
}
