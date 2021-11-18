# Create Glee App

The easiest way to get started with Glee is by using `create-eventcatalog`. This CLI tool enables you to quickly start building a new Glee application, with everything set up for you. You can create a new app using the default Glee template, or by using one of the [official Glee examples](https://github.com/asyncapi/glee/tree/master/examples). To get started, use the following command:

```bash
npx create-eventcatalog
```

To create a new app in a specific folder, you can send a name as an argument. For example, the following command will create a new Glee app called `blog-app` in a folder with the same name:

```bash
npx create-eventcatalog blog-app
```

## Options

`create-eventcatalog` comes with the following options:

- **-e, --example [name]|[github-url]** - An example to bootstrap the app with. You can use an example name from the [Glee repo](https://github.com/asyncapi/glee/tree/master/examples) or a GitHub URL. The URL can use any branch and/or subdirectory.
- **--example-path &lt;path-to-example&gt;** - In a rare case, your GitHub URL might contain a branch name with a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar). In this case, you must specify the path to the example separately: `--example-path foo/bar`

## Why use Create Glee App?

`create-eventcatalog` allows you to create a new Glee app within seconds. It is officially maintained by the creators of Glee, and includes a number of benefits:

- **Interactive Experience**: Running `npx create-eventcatalog` (with no arguments) launches an interactive experience that guides you through setting up a project.
- **Zero Dependencies**: Initializing a project is as quick as one second. Create Glee App has zero dependencies.
- **Support for Examples**: Create Glee App can bootstrap your application using an example from the Glee examples collection (e.g. `npx create-eventcatalog --example shrek-websockets`).
- **Tested**: The package is tested together with the Glee test suite, ensuring it works as expected with every release.
