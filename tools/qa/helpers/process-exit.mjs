/** Native acceptance must fail promptly instead of leaving a hung application. */
export function waitForChildExit(child, timeoutMs = 10000) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); child.off('exit', done); child.off('error', failed); };
    const done = code => { cleanup(); resolve(code); };
    const failed = error => { cleanup(); reject(error); };
    const timer = setTimeout(() => { cleanup(); child.kill('SIGKILL'); reject(Error('Native process exit timeout')); }, timeoutMs);
    child.once('exit', done); child.once('error', failed);
  });
}
