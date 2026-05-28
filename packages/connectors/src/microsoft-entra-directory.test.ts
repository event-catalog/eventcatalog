import { beforeEach, describe, expect, it, vi } from "vitest";
import { microsoftEntraDirectory } from "./microsoft-entra-directory";

const fetchMock = vi.fn();

describe("microsoftEntraDirectory", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads configured groups and direct enabled members from Microsoft Entra ID", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform Engineering",
          description: "Platform team",
          mail: "platform@example.com",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "user-1",
              displayName: "Jane Doe",
              userPrincipalName: "jane@example.com",
              mail: "jane.doe@example.com",
              jobTitle: "Staff Engineer",
              accountEnabled: true,
            },
            {
              id: "user-2",
              displayName: "Disabled User",
              userPrincipalName: "disabled@example.com",
              mail: "disabled@example.com",
              accountEnabled: false,
            },
          ],
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: [{ id: "group-1", alias: "platform" }],
    });

    await expect(source.loadTeams?.()).resolves.toEqual([
      {
        id: "platform",
        name: "Platform Engineering",
        summary: "Platform team",
        email: "platform@example.com",
        members: ["jane.doe@example.com"],
        markdown: [
          ":::note",
          "This team is synced from Microsoft Entra ID and is read-only in EventCatalog.",
          "",
          "Manage the team and its members in Microsoft Entra ID.",
          ":::",
        ].join("\n"),
        source: {
          provider: "microsoft-entra",
          id: "group-1",
        },
      },
    ]);
    await expect(source.loadUsers?.()).resolves.toEqual([
      {
        id: "jane.doe@example.com",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        role: "Staff Engineer",
        markdown: [
          ":::note",
          "This user is synced from Microsoft Entra ID and is read-only in EventCatalog.",
          "",
          "Manage profile details and team membership in Microsoft Entra ID.",
          ":::",
        ].join("\n"),
        source: {
          provider: "microsoft-entra",
          id: "user-1",
        },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/x-www-form-urlencoded",
        }),
      }),
    );
    expect(String(fetchMock.mock.calls[0][1].body)).toBe(
      "client_id=client-id&client_secret=client-secret&grant_type=client_credentials&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph.microsoft.com/v1.0/groups/group-1?%24select=id%2CdisplayName%2Cdescription%2Cmail",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer graph-token",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://graph.microsoft.com/v1.0/groups/group-1/members/microsoft.graph.user?%24select=id%2CdisplayName%2CuserPrincipalName%2Cmail%2CjobTitle%2CaccountEnabled",
      expect.any(Object),
    );
  });

  it("resolves groups by exact displayName and slugifies team ids when no alias is provided", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "group-1",
              displayName: "Architecture Guild",
              description: null,
              mail: null,
            },
          ],
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: [{ displayName: "Architecture Guild" }],
      users: false,
    });

    await expect(source.loadTeams?.()).resolves.toMatchObject([
      {
        id: "architecture-guild",
        name: "Architecture Guild",
        source: {
          provider: "microsoft-entra",
          id: "group-1",
        },
      },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph.microsoft.com/v1.0/groups?%24filter=displayName+eq+%27Architecture+Guild%27&%24select=id%2CdisplayName%2Cdescription%2Cmail",
      expect.any(Object),
    );
  });

  it("includes disabled users when includeDisabledUsers is enabled", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform",
          description: null,
          mail: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "user-1",
              displayName: "Disabled User",
              userPrincipalName: "disabled@example.com",
              accountEnabled: false,
            },
          ],
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
      includeDisabledUsers: true,
    });

    await expect(source.loadUsers?.()).resolves.toMatchObject([
      {
        id: "disabled@example.com",
        source: {
          id: "user-1",
        },
      },
    ]);
  });

  it("normalizes guest user principal names when no mail address is available", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform",
          description: null,
          mail: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "user-1",
              displayName: "Dave",
              userPrincipalName:
                "dave_eventcatalog.dev#EXT#@daveeventcatalog.onmicrosoft.com",
              mail: null,
              accountEnabled: true,
            },
          ],
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
    });

    await expect(source.loadTeams?.()).resolves.toMatchObject([
      {
        members: ["dave@eventcatalog.dev"],
      },
    ]);
    await expect(source.loadUsers?.()).resolves.toMatchObject([
      {
        id: "dave@eventcatalog.dev",
        email: "dave_eventcatalog.dev#EXT#@daveeventcatalog.onmicrosoft.com",
        source: {
          id: "user-1",
        },
      },
    ]);
  });

  it("follows Microsoft Graph pagination links for group members", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform",
          description: null,
          mail: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "user-1",
              displayName: "Jane Doe",
              userPrincipalName: "jane@example.com",
              accountEnabled: true,
            },
          ],
          "@odata.nextLink":
            "https://graph.microsoft.com/v1.0/groups/group-1/members/microsoft.graph.user?$skiptoken=next",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "user-2",
              displayName: "John Doe",
              userPrincipalName: "john@example.com",
              accountEnabled: true,
            },
          ],
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
    });

    await expect(source.loadUsers?.()).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://graph.microsoft.com/v1.0/groups/group-1/members/microsoft.graph.user?$skiptoken=next",
      expect.any(Object),
    );
  });

  it("retries Microsoft Graph 429 responses before failing or returning data", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        new Response("Too many requests", {
          status: 429,
          statusText: "Too Many Requests",
          headers: {
            "retry-after": "0",
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform",
          description: null,
          mail: null,
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
      users: false,
    });

    await expect(source.loadTeams?.()).resolves.toMatchObject([
      {
        id: "platform",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws when a displayName lookup is missing or ambiguous", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(jsonResponse({ value: [] }));

    const missingSource = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: [{ displayName: "Missing Group" }],
      users: false,
    });

    await expect(missingSource.loadTeams?.()).rejects.toThrow(
      'Microsoft Entra directory connector could not find a group with displayName "Missing Group". Use the group id instead.',
    );

    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            { id: "group-1", displayName: "Platform" },
            { id: "group-2", displayName: "Platform" },
          ],
        }),
      );

    const ambiguousSource = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: [{ displayName: "Platform" }],
      users: false,
    });

    await expect(ambiguousSource.loadTeams?.()).rejects.toThrow(
      'Microsoft Entra directory connector found 2 groups with displayName "Platform". Use the group id instead.',
    );
  });

  it("throws when configured groups resolve to duplicate EventCatalog team ids", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-1",
          displayName: "Platform Engineering",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "group-2",
          displayName: "Platform-Engineering",
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1", "group-2"],
      users: false,
    });

    await expect(source.loadTeams?.()).rejects.toThrow(
      'Microsoft Entra directory connector resolved duplicate team id "platform-engineering" from groups "group-1" and "group-2". Set alias for one of the groups.',
    );
  });

  it("throws when required options are missing", () => {
    expect(() =>
      microsoftEntraDirectory({
        tenantId: "tenant-id",
        clientId: "client-id",
        clientSecret: "client-secret",
      } as never),
    ).toThrow(
      'Microsoft Entra directory connector requires at least one group. Set groups: [{ id: "00000000-0000-0000-0000-000000000000" }].',
    );
  });

  it("throws with the Microsoft Graph response body when a request fails", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("graph-token"))
      .mockResolvedValueOnce(
        new Response("Insufficient privileges", {
          status: 403,
          statusText: "Forbidden",
        }),
      );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
      users: false,
    });

    await expect(source.loadTeams?.()).rejects.toThrow(
      "Microsoft Entra directory connector failed (403 Forbidden): Insufficient privileges",
    );
  });

  it("throws with the token response body when authentication fails", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("invalid_client", {
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    const source = microsoftEntraDirectory({
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
      groups: ["group-1"],
      users: false,
    });

    await expect(source.loadTeams?.()).rejects.toThrow(
      "Microsoft Entra directory connector failed to get an access token (401 Unauthorized): invalid_client",
    );
  });
});

const tokenResponse = (token: string) =>
  jsonResponse({
    token_type: "Bearer",
    expires_in: 3599,
    access_token: token,
  });

const jsonResponse = (body: unknown, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
