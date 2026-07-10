---
sidebar_position: 3
sidebar_label: Configure categories
title: Configure categories
description: Control sidebar labels and ordering for doc type groups using category files.
keywords:
  - EventCatalog resource docs categories
  - category.json
  - resource documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="2.x.0" />
<PlanBanner plan="Scale" />

When you group resource docs into subdirectories, each subdirectory becomes a section in the resource sidebar. By default, the section label is the folder name and sections are sorted alphabetically.

**Categories** let you customise this — you can give a group a friendlier display label and control the order it appears relative to other groups, without renaming the folder.

## Category files

Place a `category.json` file inside any doc type folder to configure its sidebar label and position.

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersService',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'docs',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'runbooks',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    { name: 'category.json', highlight: true },
                    { name: '01-deployment.md' },
                    { name: '02-incident-response.md' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

```json title="services/OrdersService/docs/runbooks/category.json"
{
  "label": "Runbooks",
  "position": 1
}
```

### Category file properties

| Property   | Required | Description                                                      |
|------------|----------|------------------------------------------------------------------|
| `label`    | No       | Display name for the doc type group in the sidebar.             |
| `position` | No       | Sort order of the group relative to other doc type groups.      |

### Use `_category_.json` as an alternative

EventCatalog also accepts `_category_.json` as the file name. When both files exist in the same folder, `category.json` takes precedence.

### Control group ordering

Set `position` on each group to control the order they appear in the sidebar. Groups without a position are sorted alphabetically after positioned groups.

```json title="docs/adrs/category.json"
{
  "label": "Architecture decisions",
  "position": 1
}
```

```json title="docs/runbooks/category.json"
{
  "label": "Runbooks",
  "position": 2
}
```
