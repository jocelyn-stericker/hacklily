#![warn(clippy::all)]

extern crate renderer_lib;

mod util;

use self::util::run_test;
use renderer_lib::request::{Backend, Request, Response, Version};

#[test]
fn simple() {
    fn get_request(id: &str, version: Version) -> Request {
        Request {
            id: id.to_owned(),
            backend: Backend::Svg,
            src: include_str!("ly/simple.ly").to_owned(),
            version,
        }
    };

    let stable_response = Response {
        files: vec![include_str!("ly/simple.ly.2_18_2.svg").to_owned()],
        logs: include_str!("ly/simple.ly.2_18_2.txt").to_owned(),
        midi: "".to_owned(),
    };

    let unstable_response = Response {
        files: vec![include_str!("ly/simple.ly.2_19_82.svg").to_owned()],
        logs: include_str!("ly/simple.ly.2_19_82.txt").to_owned(),
        midi: "".to_owned(),
    };

    assert_eq!(
        run_test(vec![
            get_request("simple1", Version::Unstable),
            get_request("simple2", Version::Stable),
            get_request("simple3", Version::Unstable),
            get_request("simple4", Version::Stable),
            get_request("simple5", Version::Unstable),
            get_request("simple6", Version::Stable),
            get_request("simple7", Version::Unstable),
            get_request("simple8", Version::Stable),
            get_request("simple9", Version::Unstable),
            get_request("simple10", Version::Stable),
        ]),
        cloned_hashmap!{
            "simple1" => unstable_response,
            "simple2" => stable_response,
            "simple3" => unstable_response,
            "simple4" => stable_response,
            "simple5" => unstable_response,
            "simple6" => stable_response,
            "simple7" => unstable_response,
            "simple8" => stable_response,
            "simple9" => unstable_response,
            "simple10" => stable_response
        }
    );
}
