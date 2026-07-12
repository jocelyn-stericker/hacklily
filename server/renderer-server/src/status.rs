// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

// Shared live-operational-state snapshot backing the coordinator's
// `get_status` RPC. This replaces the Qt `HacklilyServer`'s in-class
// counters (`_analytics_*`, `_renderers`, `_busyWorkers`, `_freeWorkers`,
// `_requests`, `_sockets`, `_startupTime`) — but unlike the Qt server,
// the Rust coordinator's render pool and request backlog live in the
// event loop (`event_loop::state::State`), the remote-worker counts
// live in `worker_registry::WorkerRegistryHandle`, and the analytics /
// active-user counts live in the coordinator. `StatusSnapshot` is the
// single place all three subsystems publish their numbers, and the
// coordinator reads it when answering `get_status`.
//
// All fields are `AtomicU64` so writers in different tasks never block
// each other and the reader (a frontend connection task) never blocks
// writers. `StatusHandle` is a cheap `Arc` clone handed to every
// subsystem at startup (in `main.rs`).
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

/// Live operational state, shared between the coordinator, the event
/// loop, and the worker registry. Each field is owned by exactly one
/// writer subsystem; the coordinator reads them all in `get_status`.
pub struct StatusSnapshot {
    // --- event loop (local render pool + backlog) ---
    pub local_total: AtomicU64,
    pub local_busy: AtomicU64,
    pub local_free: AtomicU64,
    pub backlog: AtomicU64,
    // --- worker registry (remote workers) ---
    pub remote_total: AtomicU64,
    pub remote_busy: AtomicU64,
    pub remote_free: AtomicU64,
    // --- coordinator (clients + analytics) ---
    pub active_users: AtomicU64,
    pub analytics_renders: AtomicU64,
    pub analytics_saves: AtomicU64,
    pub analytics_sign_in: AtomicU64,
    // --- immutable ---
    startup_instant: Instant,
    startup_unix: u64,
}

impl StatusSnapshot {
    /// Seconds since the coordinator started.
    pub fn uptime_secs(&self) -> u64 {
        self.startup_instant.elapsed().as_secs()
    }

    /// Startup time as a coarse string. The Qt server emitted
    /// `QDateTime::toString(Qt::ISODate)` (e.g. `2026-07-02T...`);
    /// without a chrono dependency we fall back to a unix epoch
    /// marker, which the frontend status page displays verbatim in a
    /// `<pre>`. The `uptime_secs` field carries the precise value.
    pub fn startup_time(&self) -> String {
        format!("unix:{}", self.startup_unix)
    }
}

/// Cloneable handle. Cheap to clone (one `Arc`).
#[derive(Clone)]
pub struct StatusHandle {
    inner: Arc<StatusSnapshot>,
}

impl Default for StatusHandle {
    fn default() -> Self {
        StatusHandle::new()
    }
}

impl StatusHandle {
    pub fn new() -> Self {
        let startup_unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        StatusHandle {
            inner: Arc::new(StatusSnapshot {
                local_total: AtomicU64::new(0),
                local_busy: AtomicU64::new(0),
                local_free: AtomicU64::new(0),
                backlog: AtomicU64::new(0),
                remote_total: AtomicU64::new(0),
                remote_busy: AtomicU64::new(0),
                remote_free: AtomicU64::new(0),
                active_users: AtomicU64::new(0),
                analytics_renders: AtomicU64::new(0),
                analytics_saves: AtomicU64::new(0),
                analytics_sign_in: AtomicU64::new(0),
                startup_instant: Instant::now(),
                startup_unix,
            }),
        }
    }

    /// Borrow the underlying snapshot for field updates / reads.
    pub fn snapshot(&self) -> &StatusSnapshot {
        &self.inner
    }

    /// Seconds since the coordinator started (forwards to the snapshot).
    pub fn uptime_secs(&self) -> u64 {
        self.inner.uptime_secs()
    }

    /// Startup time string (forwards to the snapshot).
    pub fn startup_time(&self) -> String {
        self.inner.startup_time()
    }

    /// Convenience: atomically increment a counter and return the new
    /// value, mirroring the old `SharedState::bump` helper.
    pub fn bump(counter: &AtomicU64) -> u64 {
        counter.fetch_add(1, Ordering::Relaxed) + 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handle_is_cheap_clone_sharing_state() {
        let a = StatusHandle::new();
        let b = a.clone();
        StatusHandle::bump(&a.snapshot().analytics_renders);
        assert_eq!(b.snapshot().analytics_renders.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn uptime_grows() {
        let h = StatusHandle::new();
        let u0 = h.snapshot().uptime_secs();
        std::thread::sleep(std::time::Duration::from_millis(1100));
        let u1 = h.snapshot().uptime_secs();
        assert!(u1 > u0, "uptime should advance: {} -> {}", u0, u1);
    }

    #[test]
    fn startup_time_is_unix_marked() {
        let h = StatusHandle::new();
        assert!(h.snapshot().startup_time().starts_with("unix:"));
    }
}

