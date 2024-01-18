---
sidebar_position: 2
id: customise
title: Customise EventCatalog
---  

With EventCatalog you can customise styling, icons, links and much more.

![Custom Landingpage](/img/guides/customise/custom-landing.png)

### Logos & Favicons

When you initialise your EventCatalog folder you will have a `public` directory.

You can replace the `logo.svg` and `favicon.ico` files here. The changes will then be shown on your Catalog.

### Title & Description

You can change your Catalogs title and description, you can find more details in the [eventcatalog.config.js API](/docs/api/eventcatalog-config#title)

### Footer Links

Every page in EventCatalog has a footer which you can customise. 

To change the links head over to the `eventcatalog.config.js` file and change the [footerLinks](/docs/api/eventcatalog-config#footer-links)

If you don't want any footer links, just remove them from the `eventcatalog.config.js` file.

### Badges

You can configure custom badges on the [*grid style* pages](https://app.eventcatalog.dev/events/) (events, services and domains) of your Eventcatalog by using the `badges` property in frontmatter of your Eventcatalog files. The `badges` property is an array of `badge` objects that configure some text `content` as well as a `backgroundColor` and `textColor` which should be configured with color names "red", "blue" etc. This object has the following schema:
```ts
export interface Badge {
  content: string;
  backgroundColor: string;
  textColor: string;
}
```

An example Eventcatalog file with badges configured with a "New!" badge with blue text and blue background would be:
```markdown
---
name: AddedItemToCart
version: 0.0.2
summary: |
  Holds information about what the user added to their shopping cart.
producers:
    - Basket Service
consumers:
    - Data Lake
owners:
    - dboyne
    - mSmith
badges:
    - content: New!
      backgroundColor: blue
      textColor: blue 
---
```

Which would result in the following display on the grid style pages as:

![Custom Landingpage](/img/guides/customise/example-badge.png)


### Styling EventCatalog

EventCatalog supports custom styling. When you create your catalog you will have a `eventcatalog.styles.css` file.

:::tip Upgrading to styling
If you have an old version of EventCatalog, update to the latest version of `eventcatalog/core` and add a `eventcatalog.styles.css` in the root of your project.
:::

#### Custom classes

EventCatalog has custom classes which you can change the styles of, these have a prefix of `ec-`.

:::warning 
In theory you can customise anything you want, but beware that classes my change. It's best to use the supported classed below to change the styles.
:::

#### Supported classes

- `.ec-homepage` - Change the background of EventCatalog homepage

```css
.ec-homepage{
    # Changes the background of the homepage to black
    background:black;
}
```

If you want any more customizations please raise a [GitHub issue](https://github.com/boyney123/eventcatalog) or join us in [Discord](https://discord.com/invite/3rjaZMmrAm).