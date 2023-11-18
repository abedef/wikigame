# Lie to Me

![](static/logo.png)

## Caveats

- Wasted a lot of time missing a particular point of the socket.io documentation discussed [here](https://stackoverflow.com/a/45951980) relating to `socket.to(...)`

## To Do

- Show a little tool tip during the rounds that explains what each person should be doing
  - "Confused? Click here to learn what your current roles and goals are – but make sure no one is looking over your shoulder!"
- It should appear like each article is locked in as soon as it is displayed
- Support "kicking" players as the host/guesser
- Add a timer to the skip button (as a sort-of debounce mechanism);

## Requirements

To run the server, you must configure a PocketBase instance and define `PUBLIC_POCKETBASE_URL` in `.env`.

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
