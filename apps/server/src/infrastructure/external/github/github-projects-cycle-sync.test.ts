import { describe, expect, it, vi } from 'vitest';

import { GitHubProjectsCycleSync } from './github-projects-cycle-sync';
import type { GitHubGraphqlClient } from './github-projects-cycle-sync';

describe('GitHubProjectsCycleSync', () => {
  it('updates the linked GitHub Project item status and cycle dates', async () => {
    const graphql = vi.fn(async (query: string) => {
      if (query.includes('query($owner')) {
        return {
          organization: {
            projectsV2: {
              nodes: [
                {
                  id: 'project-2',
                  title: '똥글똥글 2기',
                  fields: {
                    nodes: [
                      {
                        __typename: 'ProjectV2SingleSelectField',
                        id: 'status-field',
                        name: 'Status',
                        options: [
                          { id: 'ready', name: 'Ready' },
                          { id: 'progress', name: 'In progress' },
                          { id: 'done', name: 'Done' },
                        ],
                      },
                      {
                        __typename: 'ProjectV2Field',
                        id: 'start-field',
                        name: 'Start date',
                      },
                      {
                        __typename: 'ProjectV2Field',
                        id: 'target-field',
                        name: 'Target date',
                      },
                    ],
                  },
                },
              ],
            },
          },
          repository: {
            issue: {
              id: 'issue-16',
              projectItems: {
                nodes: [{ id: 'item-16', project: { id: 'project-2' } }],
              },
            },
          },
        };
      }
      return {
        updateProjectV2ItemFieldValue: { projectV2Item: { id: 'item-16' } },
      };
    });

    const sync = new GitHubProjectsCycleSync(
      async () => ({
        graphql: graphql as unknown as GitHubGraphqlClient['graphql'],
      }),
      () => new Date('2026-04-27T00:00:00.000Z')
    );

    await sync.syncCycle({
      organizationSlug: 'donguel-donguel',
      organizationName: '똥글똥글',
      generationName: '똥글똥글 2기',
      week: 7,
      startDate: new Date('2026-04-26T15:00:00.000Z'),
      endDate: new Date('2026-05-10T14:59:59.000Z'),
      githubIssueUrl:
        'https://github.com/hanghae-story-forge/archive/issues/16',
    });

    expect(graphql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('organization(login: $owner)'),
      {
        owner: 'hanghae-story-forge',
        repo: 'archive',
        issueNumber: 16,
      }
    );
    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      {
        projectId: 'project-2',
        itemId: 'item-16',
        fieldId: 'status-field',
        value: { singleSelectOptionId: 'progress' },
      }
    );
    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      {
        projectId: 'project-2',
        itemId: 'item-16',
        fieldId: 'start-field',
        value: { date: '2026-04-27' },
      }
    );
    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      {
        projectId: 'project-2',
        itemId: 'item-16',
        fieldId: 'target-field',
        value: { date: '2026-05-10' },
      }
    );
  });
});
