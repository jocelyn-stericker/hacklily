#![warn(clippy::all)]

extern crate renderer_lib;

mod util;

use self::util::run_test;
use renderer_lib::request::{Backend, Request, Response, Version};

#[test]
fn sleep() {
    fn get_sleep_request(id: &str, version: Version) -> Request {
        Request {
            id: id.to_owned(),
            backend: Backend::Svg,
            src: include_str!("ly/sleep.ly").to_owned(),
            version,
        }
    };
    fn get_simple_request(id: &str, version: Version) -> Request {
        Request {
            id: id.to_owned(),
            backend: Backend::Svg,
            src: include_str!("ly/simple.ly").to_owned(),
            version,
        }
    };

    let simple_stable_response = Response {
        files: vec![include_str!("ly/simple.ly.2_18_2.svg").to_owned()],
        logs: include_str!("ly/simple.ly.2_18_2.txt").to_owned(),
        midi: "".to_owned(),
    };

    let simple_unstable_response = Response {
        files: vec![include_str!("ly/simple.ly.2_19_82.svg").to_owned()],
        logs: include_str!("ly/simple.ly.2_19_82.txt").to_owned(),
        midi: "".to_owned(),
    };

    let sleep_stable_response = Response {
        files: vec![include_str!("ly/sleep.ly.2_18_2.svg").to_owned()],
        logs: include_str!("ly/sleep.ly.2_18_2.txt").to_owned(),
        midi: "".to_owned(),
    };

    let sleep_unstable_response = Response {
        files: vec![include_str!("ly/sleep.ly.2_19_82.svg").to_owned()],
        logs: include_str!("ly/sleep.ly.2_19_82.txt").to_owned(),
        midi: "".to_owned(),
    };

    assert_eq!(
        run_test(vec![
            get_sleep_request("sleep1", Version::Unstable),
            get_sleep_request("sleep2", Version::Unstable),
            get_sleep_request("sleep3", Version::Unstable),
            get_sleep_request("sleep4", Version::Unstable),
            get_sleep_request("sleep1s", Version::Stable),
            get_sleep_request("sleep2s", Version::Stable),
            get_sleep_request("sleep3s", Version::Stable),
            get_sleep_request("sleep4s", Version::Stable),
            get_simple_request("simple1", Version::Unstable),
            get_simple_request("simple1s", Version::Stable),
        ]),
        cloned_hashmap!{
            "sleep1" => sleep_unstable_response,
            "sleep2" => sleep_unstable_response,
            "sleep3" => sleep_unstable_response,
            "sleep4" => sleep_unstable_response,
            "sleep1s" => sleep_stable_response,
            "sleep2s" => sleep_stable_response,
            "sleep3s" => sleep_stable_response,
            "sleep4s" => sleep_stable_response,
            "simple1" => simple_unstable_response,
            "simple1s" => simple_stable_response
        }
    );
}
