import { beforeEach, describe, expect, it, vi } from "vitest";
import { githubDirectory } from "./github-directory";

const fetchMock = vi.fn();

describe("githubDirectory", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads teams and their members from a GitHub organization", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 123,
            name: "Platform",
            slug: "platform",
            description: "Platform team",
            html_url: "https://github.com/orgs/acme/teams/platform",
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 456,
            login: "jane",
            avatar_url: "https://avatars.githubusercontent.com/u/456",
            html_url: "https://github.com/jane",
          },
        ]),
      );

    const source = githubDirectory({
      org: "acme",
      token: "github-token",
    });

    await expect(source.loadTeams?.()).resolves.toEqual([
      {
        id: "platform",
        name: "Platform",
        summary: "Platform team",
        members: ["jane"],
        markdown: [
          ":::note",
          "This team is synced from GitHub and is read-only in EventCatalog.",
          "",
          "Manage the team and its members in GitHub.",
          "",
          "[View team on GitHub](https://github.com/orgs/acme/teams/platform)",
          ":::",
        ].join("\n"),
        source: {
          provider: "github",
          id: "123",
          url: "https://github.com/orgs/acme/teams/platform",
        },
      },
    ]);
    await expect(source.loadUsers?.()).resolves.toEqual([
      {
        id: "jane",
        name: "jane",
        avatarUrl: "https://avatars.githubusercontent.com/u/456",
        markdown: [
          ":::note",
          "This user is synced from GitHub and is read-only in EventCatalog.",
          "",
          "Manage profile details and team membership in GitHub.",
          "",
          "[View user on GitHub](https://github.com/jane)",
          ":::",
        ].join("\n"),
        source: {
          provider: "github",
          id: "456",
          url: "https://github.com/jane",
        },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/orgs/acme/teams?per_page=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer github-token",
          "x-github-api-version": "2022-11-28",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/orgs/acme/teams/platform/members?per_page=100",
      expect.any(Object),
    );
  });

  it("filters teams by slug and avoids loading members when users are disabled", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: 123,
          name: "Platform",
          slug: "platform",
          description: null,
          html_url: "https://github.com/orgs/acme/teams/platform",
        },
        {
          id: 789,
          name: "Product",
          slug: "product",
          description: null,
          html_url: "https://github.com/orgs/acme/teams/product",
        },
      ]),
    );

    const source = githubDirectory({
      org: "acme",
      teams: ["platform"],
      users: false,
    });

    await expect(source.loadTeams?.()).resolves.toEqual([
      {
        id: "platform",
        name: "Platform",
        summary: undefined,
        markdown: [
          ":::note",
          "This team is synced from GitHub and is read-only in EventCatalog.",
          "",
          "Manage the team and its members in GitHub.",
          "",
          "[View team on GitHub](https://github.com/orgs/acme/teams/platform)",
          ":::",
        ].join("\n"),
        source: {
          provider: "github",
          id: "123",
          url: "https://github.com/orgs/acme/teams/platform",
        },
      },
    ]);
    await expect(source.loadUsers?.()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows GitHub pagination links", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          [
            {
              id: 123,
              name: "Platform",
              slug: "platform",
              description: null,
              html_url: "https://github.com/orgs/acme/teams/platform",
            },
          ],
          {
            link: '<https://api.github.com/orgs/acme/teams?page=2&per_page=100>; rel="next"',
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: 789,
            name: "Product",
            slug: "product",
            description: null,
            html_url: "https://github.com/orgs/acme/teams/product",
          },
        ]),
      );

    const source = githubDirectory({
      org: "acme",
      users: false,
    });

    await expect(source.loadTeams?.()).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/orgs/acme/teams?page=2&per_page=100",
      expect.any(Object),
    );
  });

  it("throws with the GitHub response body when a request fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Requires authentication", {
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    const source = githubDirectory({
      org: "acme",
      users: false,
    });

    await expect(source.loadTeams?.()).rejects.toThrow(
      "GitHub directory connector failed (401 Unauthorized): Requires authentication",
    );
  });
});

const jsonResponse = (body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
