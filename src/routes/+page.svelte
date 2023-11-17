<script lang="ts">
  import { SocketEvent, type Article, type Room, type PlayerID } from "$lib";
  import { io } from "socket.io-client";
  import { slide } from "svelte/transition";
  import type { PageServerData } from "./$types";
  import { onMount } from "svelte";
  import Renamer from "$lib/renamer.svelte";

  export let data: PageServerData;

  $: console.log(data);

  let room: Room | undefined;
  let articles: Article[] = [];
  let codeInput: HTMLInputElement;
  let code: string = "";
  let name: string = "";

  $: src = articles.at(0)?.url ?? "";
  $: title = articles.at(0)?.title ?? "";
  $: if (code?.length === 5 && !room) {
    codeInput?.blur();
    socket.emit(SocketEvent.Join, data.id, code);
    code = "";
  }

  const saveName = () => socket.emit(SocketEvent.Update, data.id, name);
  const start = () => socket.emit(SocketEvent.Start, code);
  const host = () => socket.emit(SocketEvent.Host, data.id);
  const leave = () => {
    socket.emit(SocketEvent.Leave, data.id);
    room = undefined;
  };
  const kick = (id: PlayerID) => socket.emit(SocketEvent.Kick, id);

  const skipArticle = () => {
    if (articles.length > 1) articles = articles.slice(1);
  };

  const socket = io();
  socket.prependAny((event, ...args) => console.info(`→ ${event}`, args));
  socket.prependAnyOutgoing((event, ...args) =>
    console.info(`← ${event}`, args)
  );
  socket.on(SocketEvent.Update, (update: Room | undefined) => {
    room = update;
    name =
      update?.expand?.players.find((player) => player.id === data.id)?.name ??
      "";
  });
  socket.on(SocketEvent.Error, (message: string) => alert(message));

  onMount(() => socket.emit(SocketEvent.Join, data.id));
</script>

<div class="container">
  <div class="logo">
    <img
      class="logo-light"
      src="logo.png"
      alt="Lie to Me: The Bull$#!&^ing Game"
    />
    <img
      class="logo-dark"
      src="logo-dark.png"
      alt="Lie to Me: The Bull$#!&^ing Game"
    />
  </div>

  <main>
    {#if !room}
      <button on:click={host}>Host a Room</button>
      <div class="divider">
        <hr class="left" />
        <span class="hr"> or </span>
        <hr class="right" />
      </div>
      <label for="roomCode">Enter room code:</label>
      <input
        bind:this={codeInput}
        bind:value={code}
        type="text"
        pattern="\d*"
        name="code"
        id="roomCode"
        maxlength="5"
        placeholder="•••••"
      />
    {:else}
      <div id="players">
        {#each room.expand?.players ?? [] as player}
          <code title={player.id}
            >{player.name.length > 0 ? player.name : player.id}{player.id ===
            data.id
              ? " (you)"
              : ""}
            <a href="#" on:click={() => kick(player.id)}>×</a>
          </code>
        {/each}
      </div>

      <div transition:slide class="roomCodeDisplay">
        <h4 class="code">{room.code}</h4>
        <h6 class="code">Room code</h6>
      </div>

      <button
        disabled={!!"state !== State.Hosting" || room.players.length < 3}
        on:click={start}>Start</button
      >

      {#if articles.length > 0}
        <div>
          <button on:click={() => "selectArticle"}>pick article</button>
          <button disabled={!(articles.length > 1)} on:click={skipArticle}
            >{articles.length > 1
              ? `skip article (${articles.length - 1} skips left)`
              : "no skips remaining"}</button
          >
          <button on:click={() => {}}>advance stage</button>
        </div>
        <h1>Players are making their selections...</h1>
        {#if src}
          <iframe {src} {title} frameborder="0" width="100%" height="100%" />
        {:else}
          <h1>Loading...</h1>
        {/if}
      {/if}
      <button on:click={leave}>Leave</button>
    {/if}

    <Renamer bind:name {saveName} />
  </main>
</div>

<style>
  div#players {
  }
  h4.code {
    margin: 0;
  }

  h6.code {
    margin: 0;
    text-transform: uppercase;
  }

  button {
    background-color: white;
    padding: 0.5rem 1rem;
    font-weight: bold;
    border: solid 0.0625rem #00000000;
    border-radius: 0.125rem;
  }

  button:hover {
    background-color: #eee;
    cursor: pointer;
  }

  button:active {
    background-color: #eee;
    border-color: black;
  }

  @media (prefers-color-scheme: dark) {
    button {
      background-color: #1e1e1e;
      padding: 0.5rem 1rem;
      font-weight: bold;
      border: solid 0.0625rem #00000000;
      border-radius: 0.125rem;
    }

    button:hover {
      background-color: #222;
      cursor: pointer;
    }

    button:active {
      background-color: #222;
      border-color: #aaa;
    }
  }

  input#name {
    background-color: #8884;
    min-width: 200px;
  }
  .roomCodeInput,
  .roomCodeDisplay {
    display: flex;
    flex-direction: column;
  }

  h3,
  h4 {
    text-align: center;
  }

  h3 {
    margin-bottom: 0;
  }

  h4 {
    margin-top: 0;
  }

  input {
    text-transform: uppercase;

    text-align: center;

    max-width: 5ch;

    margin: 1rem auto;
  }

  div.container {
    margin: 0 auto;

    display: flex;
    flex-direction: column;
    justify-content: center;

    text-align: center;

    height: 100%;

    max-width: 500px;

    gap: 0.5rem;

    font-family: sans-serif;
  }

  div.logo {
    display: flex;
    justify-content: center;
  }

  img.logo-light {
    /* scale: 0.5; */
    max-width: 122px;
  }
  img.logo-dark {
    /* scale: 0.5; */
    max-width: 0;
  }

  @media (prefers-color-scheme: dark) {
    img.logo-light {
      /* scale: 0.5; */
      max-width: 0;
    }
    img.logo-dark {
      /* scale: 0.5; */
      max-width: 122px;
    }
  }

  main {
    min-height: 300px;

    display: flex;
    flex-direction: column;

    justify-content: space-evenly;
  }
  @keyframes updown {
    0% {
      transform: translateY(-5px);
    }

    50% {
      transform: translateY(10px);
    }

    100% {
      transform: translateY(-5px);
    }
  }

  div.player {
    animation: updown 5s ease infinite;
  }

  div.funfun {
    display: flex;
    flex-wrap: wrap;

    justify-content: center;
  }

  div.profile h5 {
    margin-bottom: 0;
  }

  div.profile h6 {
    margin-top: 0;
  }

  div#room-buttons {
    display: flex;
    justify-content: space-evenly;
    flex-direction: column;
  }

  div.divider {
    display: flex;
    gap: 0.5rem;
  }

  hr {
    width: 25px;
    border-width: 1px;
  }

  hr,
  span.hr {
    opacity: 0.25;
  }

  hr.left {
    margin-right: 0;
  }

  hr.right {
    margin-left: 0;
  }

  /* nav {
        height: 3rem;

        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }
    iframe {
        border-radius: 1rem;
        box-shadow: rgba(0, 0, 0, 0.18) 0px 2px 4px;
    }
    div {
        position: absolute;
        top: 4rem;
        bottom: 1rem;
        left: 1rem;
        right: 1rem;
    }

    a:hover {
        opacity: 1;
    }
    a {
        transition: all 0.3s ease 0s;
        opacity: 0.75;

        height: 100%;
    }

    h1 {
        padding: 0;
        margin: 0;

        font-family: sans-serif;

        flex: 1;

        text-align: center;
    }

    nav > a {
        min-width: 3rem;
    } */
</style>
