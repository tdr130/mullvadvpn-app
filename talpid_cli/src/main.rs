// `error_chain!` can recurse deeply
#![recursion_limit = "1024"]

extern crate talpid_core;
#[macro_use]
extern crate clap;
#[macro_use]
extern crate error_chain;

use std::io::{self, Read, Write};
use std::sync::mpsc::{self, Receiver};
use std::thread;

use talpid_core::process::monitor::{ChildMonitor, ChildSpawner};
use talpid_core::process::openvpn::OpenVpnCommand;

mod cli;

use cli::Args;


error_chain! {
    links {
        Monitor(talpid_core::process::monitor::Error, talpid_core::process::monitor::ErrorKind);
    }
}


fn main() {
    if let Err(ref e) = run() {
        println!("error: {}", e);
        for e in e.iter().skip(1) {
            println!("caused by: {}", e);
        }
        if let Some(backtrace) = e.backtrace() {
            println!("backtrace: {:?}", backtrace);
        }
        ::std::process::exit(1);
    }
}

fn run() -> Result<()> {
    let args = cli::parse_args_or_exit();
    let command = create_openvpn_command(&args);
    let monitor = ChildMonitor::new(command);
    main_loop(monitor)
}

fn create_openvpn_command(args: &Args) -> OpenVpnCommand {
    let mut command = OpenVpnCommand::new(&args.binary);
    command.config(&args.config)
        .remotes(&args.remotes[..])
        .unwrap()
        .pipe_output(args.verbosity > 0);

    command
}

fn main_loop<S>(mut monitor: ChildMonitor<S>) -> Result<()>
    where S: ChildSpawner
{
    loop {
        let rx = start_monitor(&mut monitor).chain_err(|| "Unable to start OpenVPN")?;
        let clean_exit = rx.recv().unwrap();
        println!("Monitored process exited. clean: {}", clean_exit);
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
}

fn start_monitor<S>(monitor: &mut ChildMonitor<S>) -> Result<Receiver<bool>>
    where S: ChildSpawner
{
    let (tx, rx) = mpsc::channel();
    let callback = move |clean| tx.send(clean).unwrap();
    Ok(monitor.start(callback)
        .map(|(stdout, stderr)| {
            stdout.map(|stream| pass_io(stream, io::stdout()));
            stderr.map(|stream| pass_io(stream, io::stderr()));
            rx
        })?)
}

fn pass_io<I, O>(mut input: I, mut output: O)
    where I: Read + Send + 'static,
          O: Write + Send + 'static
{
    thread::spawn(move || { io::copy(&mut input, &mut output).unwrap(); });
}