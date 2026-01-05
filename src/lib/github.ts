import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import { env } from '../env';

let cachedOctokit: Octokit | null = null;

/**
 * GitHub App으로 인증된 Octokit 인스턴스를 반환합니다.
 * Installation Access Token은 자동으로 갱신됩니다.
 */
export async function getGitHubClient(): Promise<Octokit> {
  if (cachedOctokit) {
    return cachedOctokit;
  }

  const appId = env.APP_ID;
  const privateKey = env.APP_PRIVATE_KEY;
  const installationId = env.APP_INSTALLATION_ID;

  if (!appId || !privateKey || !installationId) {
    throw new Error(
      'GitHub App credentials are required (APP_ID, APP_PRIVATE_KEY, APP_INSTALLATION_ID)'
    );
  }

  const auth = createAppAuth({
    appId,
    privateKey: privateKey.replace(/\\n/g, '\n'),
    installationId,
  });

  const { token } = await auth({ type: 'installation' });
  cachedOctokit = new Octokit({ auth: token });

  return cachedOctokit;
}
