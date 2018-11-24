#![warn(clippy::all)]

extern crate renderer_lib;

mod util;

use self::util::run_test;
use renderer_lib::request::{Backend, Request, Response, Version};

const NUM_ITERATIONS: u32 = 5;

#[test]
fn evil() {
    // Test that some obvious evil inputs do not impact good inputs.

    env_logger::init();
    let evils = vec![
        include_str!("ly/danger_forever.ly"),
        include_str!("ly/danger_forkbomb.ly"),
        include_str!("ly/danger_kill_group.ly"),
        include_str!("ly/danger_kill_lilypond.ly"),
        include_str!("ly/danger_kill_ruby.ly"),
        include_str!("ly/danger_rm_home.ly"),
        include_str!("ly/danger_rm_slash.ly"),
        include_str!("ly/danger_rm_tmp.ly"),
    ];

    fn get_request(id: &str, src: &str, version: Version) -> Request {
        Request {
            id: id.to_owned(),
            backend: Backend::Svg,
            src: src.to_owned(),
            version,
        }
    };

    let mut tests = Vec::new();
    for iteration in 0..NUM_ITERATIONS {
        for v in &[Version::Stable, Version::Unstable] {
            for (evil_i, evil) in evils.iter().enumerate() {
                let evil_id = format!("evil_{}_{:?}_{}", evil_i, v, iteration);
                tests.push(get_request(&evil_id, evil, *v));

                let good_id = format!("good_{}_{:?}_{}", evil_i, v, iteration);
                tests.push(get_request(&good_id, include_str!("ly/simple.ly"), *v))
            }
        }
    }

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

    let res = run_test(tests);

    for iteration in 0..NUM_ITERATIONS {
        for (evil_i, _) in evils.iter().enumerate() {
            // Make sure the evil outputs gave something (anything!)
            for v in &[Version::Stable, Version::Unstable] {
                let evil_id = format!("evil_{}_{:?}_{}", evil_i, v, iteration);
                assert!(res.get(&evil_id).is_some());
            }

            // Make sure the good output is as it is supposed to be.
            let good_stable_id = format!("good_{}_{:?}_{}", evil_i, Version::Stable, iteration);
            let good_unstable_id = format!("good_{}_{:?}_{}", evil_i, Version::Unstable, iteration);

            let good_stable_output = &res[&good_stable_id];
            let good_unstable_output = &res[&good_unstable_id];

            assert_eq!(good_stable_output, &simple_stable_response);
            assert_eq!(good_unstable_output, &simple_unstable_response);
        }
    }
}
