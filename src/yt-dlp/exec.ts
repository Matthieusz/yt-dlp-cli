export type ExecResult = {
  success: boolean;
  stdout: string;
  stderr: string;
};

export type Runner = (binary: string, args: string[]) => Promise<ExecResult>;

export async function run(binary: string, args: string[]): Promise<ExecResult> {
  const proc = Bun.spawn([binary, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { success: exitCode === 0, stdout, stderr };
}
