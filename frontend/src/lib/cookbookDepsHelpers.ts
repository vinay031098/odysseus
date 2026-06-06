import { serveModel, saveCookbookState, type CookbookPackage, type CookbookState, type CookbookTask } from '@/api/cookbookServe'
import { buildEnvPrefix } from '@/lib/cookbookDownloadHelpers'

export function venvPython(envType?: string, envPath?: string): string {
  if (envType === 'venv' && envPath) {
    return `${envPath.replace(/\/+$/, '')}/bin/python3`
  }
  return 'python3'
}

function pipInstallCmd(pipName: string, upgrade = false, envPath?: string, envType?: string): string {
  const inEnv = envType === 'venv' || envType === 'conda'
  const flags = !inEnv ? ' --user --break-system-packages' : ''
  const py = venvPython(envType, envPath)
  return `${py} -m pip install${upgrade ? ' -U' : ''}${flags} "${pipName}"`
}

export async function launchCookbookPipTask(args: {
  taskName: string
  cmd: string
  state: CookbookState
  remoteHost: string
  activeServer: { port?: string; env?: string; envPath?: string; platform?: string }
  env: { env?: string; envPath?: string; platform?: string }
}): Promise<CookbookTask> {
  const { taskName, cmd, state, remoteHost, activeServer, env } = args
  const envType = remoteHost ? activeServer.env || 'none' : env.env || 'none'
  const envPath = remoteHost ? activeServer.envPath || '' : env.envPath || ''
  const envPrefix = buildEnvPrefix(envType, envPath, activeServer.platform || env.platform)
  const fullCmd = envPrefix ? `${envPrefix} && ${cmd}` : cmd
  const sessionName = `${taskName}-${Date.now().toString(36)}`

  const res = await serveModel({
    repo_id: sessionName,
    cmd: fullCmd,
    remote_host: remoteHost || undefined,
    ssh_port: activeServer.port,
    env_prefix: envPrefix,
    platform: activeServer.platform,
  })
  if (!res.ok || !res.session_id) throw new Error(res.error || 'Pip task failed')

  const task: CookbookTask = {
    sessionId: res.session_id,
    id: res.session_id,
    name: taskName,
    type: 'serve',
    status: 'running',
    ts: Date.now(),
    remoteHost: remoteHost || undefined,
    sshPort: activeServer.port,
    payload: { repo_id: sessionName, _cmd: fullCmd },
  }
  await saveCookbookState({
    ...state,
    tasks: [...(state.tasks ?? []), task],
  })
  return task
}

export async function runCookbookPipInstall(args: {
  pkg: CookbookPackage
  upgrade?: boolean
  state: CookbookState
  remoteHost: string
  activeServer: { port?: string; env?: string; envPath?: string; platform?: string }
  env: { env?: string; envPath?: string; platform?: string }
}): Promise<void> {
  const { pkg, upgrade, state, remoteHost, activeServer, env } = args
  const envType = remoteHost ? activeServer.env || 'none' : env.env || 'none'
  const envPath = remoteHost ? activeServer.envPath || '' : env.envPath || ''
  const cmd = pipInstallCmd(pkg.pip, upgrade, envPath, envType)
  await launchCookbookPipTask({
    taskName: `${upgrade ? 'Update' : 'Install'} ${pkg.name}`,
    cmd,
    state,
    remoteHost,
    activeServer,
    env,
  })
}

export async function runCookbookPipReinstall(args: {
  pkgName: string
  pipName: string
  state: CookbookState
  remoteHost: string
  activeServer: { port?: string; env?: string; envPath?: string; platform?: string }
  env: { env?: string; envPath?: string; platform?: string }
}): Promise<void> {
  const envType = args.remoteHost ? args.activeServer.env || 'none' : args.env.env || 'none'
  const envPath = args.remoteHost ? args.activeServer.envPath || '' : args.env.envPath || ''
  const py = venvPython(envType, envPath)
  const inEnv = envType === 'venv' || envType === 'conda'
  const flags = !inEnv ? ' --user --break-system-packages' : ''
  const cmd = `${py} -m pip install --force-reinstall${flags} ${args.pipName}`
  await launchCookbookPipTask({
    taskName: `reinstall-${args.pkgName}`,
    cmd,
    state: args.state,
    remoteHost: args.remoteHost,
    activeServer: args.activeServer,
    env: args.env,
  })
}
