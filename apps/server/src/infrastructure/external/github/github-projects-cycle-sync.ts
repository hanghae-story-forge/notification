import type { GithubProjectCycleSyncPort } from '@/application/commands/create-cycle.command';
import { getGitHubClient } from '@/infrastructure/lib/github';

export interface GitHubGraphqlClient {
  graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T>;
}

interface ProjectField {
  __typename: string;
  id: string;
  name: string;
  dataType?: string;
  options?: Array<{ id: string; name: string }>;
}

interface ProjectNode {
  id: string;
  title: string;
  fields: { nodes: ProjectField[] };
}

interface ProjectItemNode {
  id: string;
  project: { id: string };
}

interface LookupResponse {
  organization: {
    projectsV2: {
      nodes: ProjectNode[];
    };
  } | null;
  repository: {
    issue: {
      id: string;
      projectItems: {
        nodes: ProjectItemNode[];
      };
    } | null;
  } | null;
}

interface AddItemResponse {
  addProjectV2ItemById: {
    item: {
      id: string;
    } | null;
  };
}

const LOOKUP_PROJECT_AND_ISSUE = `
query($owner: String!, $repo: String!, $issueNumber: Int!) {
  organization(login: $owner) {
    projectsV2(first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        id
        title
        fields(first: 50) {
          nodes {
            __typename
            ... on ProjectV2FieldCommon { id name dataType }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options { id name }
            }
          }
        }
      }
    }
  }
  repository(owner: $owner, name: $repo) {
    issue(number: $issueNumber) {
      id
      projectItems(first: 50) {
        nodes {
          id
          project { id }
        }
      }
    }
  }
}
`;

const ADD_ITEM = `
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
    item { id }
  }
}
`;

const UPDATE_FIELD_VALUE = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId,
    itemId: $itemId,
    fieldId: $fieldId,
    value: $value
  }) {
    projectV2Item { id }
  }
}
`;

function parseGitHubIssueUrl(url: string): {
  owner: string;
  repo: string;
  issueNumber: number;
} | null {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)(?:[/?#].*)?$/
  );
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2],
    issueNumber: Number(match[3]),
  };
}

function toKstDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function cycleStatusName(
  startDate: Date,
  endDate: Date,
  now: Date = new Date()
): 'Ready' | 'In progress' | 'Done' {
  if (now.getTime() < startDate.getTime()) return 'Ready';
  if (now.getTime() > endDate.getTime()) return 'Done';
  return 'In progress';
}

export class GitHubProjectsCycleSync implements GithubProjectCycleSyncPort {
  constructor(
    private readonly clientFactory: () => Promise<GitHubGraphqlClient> = getGitHubClient,
    private readonly now: () => Date = () => new Date()
  ) {}

  async syncCycle(
    request: Parameters<GithubProjectCycleSyncPort['syncCycle']>[0]
  ) {
    const issueRef = parseGitHubIssueUrl(request.githubIssueUrl);
    if (!issueRef) {
      console.warn(
        `Skipping GitHub Project sync: unsupported issue URL ${request.githubIssueUrl}`
      );
      return;
    }

    const client = await this.clientFactory();
    const lookup = await client.graphql<LookupResponse>(
      LOOKUP_PROJECT_AND_ISSUE,
      {
        owner: issueRef.owner,
        repo: issueRef.repo,
        issueNumber: issueRef.issueNumber,
      }
    );

    const project = lookup.organization?.projectsV2.nodes.find(
      (node) => node.title === request.generationName
    );
    if (!project) {
      console.warn(
        `Skipping GitHub Project sync: project "${request.generationName}" not found in ${issueRef.owner}`
      );
      return;
    }

    const issue = lookup.repository?.issue;
    if (!issue) {
      console.warn(
        `Skipping GitHub Project sync: issue ${request.githubIssueUrl} not found`
      );
      return;
    }

    const existingItem = issue.projectItems.nodes.find(
      (item) => item.project.id === project.id
    );
    const itemId =
      existingItem?.id ?? (await this.addItem(client, project.id, issue.id));

    const statusField = project.fields.nodes.find(
      (field) =>
        field.name === 'Status' &&
        field.__typename === 'ProjectV2SingleSelectField'
    );
    const startDateField = project.fields.nodes.find(
      (field) => field.name === 'Start date'
    );
    const targetDateField = project.fields.nodes.find(
      (field) => field.name === 'Target date'
    );

    const updates: Array<Promise<unknown>> = [];
    if (statusField) {
      const statusName = cycleStatusName(
        request.startDate,
        request.endDate,
        this.now()
      );
      const statusOptionId = statusField.options?.find(
        (option) => option.name === statusName
      )?.id;
      if (statusOptionId) {
        updates.push(
          this.updateField(client, project.id, itemId, statusField.id, {
            singleSelectOptionId: statusOptionId,
          })
        );
      }
    }

    if (startDateField) {
      updates.push(
        this.updateField(client, project.id, itemId, startDateField.id, {
          date: toKstDateString(request.startDate),
        })
      );
    }

    if (targetDateField) {
      updates.push(
        this.updateField(client, project.id, itemId, targetDateField.id, {
          date: toKstDateString(request.endDate),
        })
      );
    }

    await Promise.all(updates);
  }

  private async addItem(
    client: GitHubGraphqlClient,
    projectId: string,
    contentId: string
  ): Promise<string> {
    const response = await client.graphql<AddItemResponse>(ADD_ITEM, {
      projectId,
      contentId,
    });
    const itemId = response.addProjectV2ItemById.item?.id;
    if (!itemId) {
      throw new Error('GitHub Project item creation returned no item id');
    }
    return itemId;
  }

  private async updateField(
    client: GitHubGraphqlClient,
    projectId: string,
    itemId: string,
    fieldId: string,
    value: Record<string, string>
  ) {
    await client.graphql(UPDATE_FIELD_VALUE, {
      projectId,
      itemId,
      fieldId,
      value,
    });
  }
}

export const githubProjectCycleSyncInternals = {
  parseGitHubIssueUrl,
  toKstDateString,
  cycleStatusName,
};
