use renderer_lib::request::{Request, Response};
use renderer_lib::{event_loop, CommandSourceConfig, Config};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[macro_export]
macro_rules! cloned_hashmap(
    { $($key:expr => $value:expr),+ } => {
        {
            let mut m = ::std::collections::HashMap::new();
            $(
                m.insert($key.to_owned(), $value.clone());
            )+
            m
        }
     };
);

pub fn run_test(requests: Vec<Request>) -> HashMap<String, Response> {
    let output = Arc::new(Mutex::new(HashMap::new()));
    let config = Config {
        stable_docker_tag: "hacklily-renderer".to_owned(),
        stable_worker_count: 4,
        unstable_docker_tag: "hacklily-renderer-unstable".to_owned(),
        unstable_worker_count: 4,
        render_timeout_msec: 8000,
        command_source: CommandSourceConfig::TestRunner {
            input: requests,
            output: output.clone(),
        },
    };
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(event_loop(config));

    let responses = output.lock().expect("Test runner panicked.");
    responses.clone()
}
