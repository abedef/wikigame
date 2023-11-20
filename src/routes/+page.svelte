<script lang="ts">
  import { SocketEvent, type Room, type PlayerID, Stage } from "$lib";
  import { io } from "socket.io-client";
  import type { PageServerData } from "./$types";
  import { onMount } from "svelte";
  import Renamer from "$lib/renamer.svelte";
  import RoomCode from "$lib/roomcode.svelte";
  import Leaderboard from "$lib/leaderboard.svelte";

  export let data: PageServerData;

  let room: Room | undefined;
  let codeInput: HTMLInputElement;
  let rawCode: string = "";
  let name: string = "";

  $: players = room?.expand?.players ?? [];
  $: code = room?.code ?? "";
  $: guesser = room?.guesser ?? "";
  $: guessee = room?.guessee ?? "";
  $: article = room?.expand?.players.find((player) => player.id === thisPlayer)
    ?.expand?.article;
  $: articles =
    room?.expand?.players.find((player) => player.id === thisPlayer)?.expand
      ?.articles ?? [];
  $: thisPlayer = data.id;
  $: thisPlayerIsGuesser = thisPlayer === guesser;
  $: thisPlayerIsGuessee = thisPlayer === guessee;

  $: src = article?.url ?? "";
  $: title = article?.title ?? "";
  $: if (rawCode?.length === 5 && !room) {
    codeInput?.blur();
    socket.emit(SocketEvent.Join, data.id, rawCode);
    rawCode = "";
  }

  const helper = () => {
    if (thisPlayerIsGuessee) {
      alert(
        `This happens to be your topic! You can't go back and read any more of your article now – hopefully you remembered enough from your readings that you can convince the guesser ${
          room?.expand?.guesser?.name ?? guesser
        } that it was indeed you who read it!`
      );
    } else if (thisPlayerIsGuesser) {
      alert(
        `You are the guesser. One of your players read the article of the round – your goal is to figure out who! Ask each player to tell you about the topic and use your insight to tell apart liars from the truth-teller.`
      );
    } else {
      alert(
        `You read a different topic... but that's ok! Your topic will come up in a later round. For now, pretend you know everything there is about this topic and do your best to convince the guesser ${
          room?.expand?.guesser?.name ?? guesser
        } that it was actually you who read it!`
      );
    }
  };

  const saveName = (newName: string) =>
    socket.emit(SocketEvent.Update, data.id, newName);
  const start = () => socket.emit(SocketEvent.Start, data.id, room?.id);
  const host = () => socket.emit(SocketEvent.Host, data.id);
  const leave = () => socket.emit(SocketEvent.Leave, data.id);
  const kick = (id: PlayerID) => socket.emit(SocketEvent.Kick, id);
  const guess = (id: PlayerID) => socket.emit(SocketEvent.Guess, id);
  const skipArticle = () => socket.emit(SocketEvent.SkipArticle, data.id);
  const advance = () => socket.emit(SocketEvent.LockIn, room?.id);
  const socket = io();
  socket.prependAny((event, ...args) => console.info(`⤵️ ${event}`, args));
  socket.prependAnyOutgoing((event, ...args) =>
    console.info(`⤴️ ${event}`, args)
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
        bind:value={rawCode}
        type="text"
        pattern="\d*"
        name="code"
        id="roomCode"
        maxlength="5"
        placeholder="•••••"
      />
    {:else}
      <Leaderboard {players} {thisPlayer} {guesser} {kick} {guess} />
      <RoomCode {code} />
      <Renamer {name} {saveName} />

      {#if room.stage === Stage.Lobby}
        <button
          disabled={room.players.length < 3 || !thisPlayerIsGuesser}
          on:click={start}>Start</button
        >
      {/if}
      {#if room.players.length < 3}
        <code>3+ players required to begin</code>
      {/if}

      {#if room.stage === Stage.Researching}
        <div>
          {#if thisPlayerIsGuesser}
            <button on:click={advance}>advance stage</button>
            <h1>Players are making their selections...</h1>
          {:else}
            <button disabled={articles.length <= 1} on:click={skipArticle}
              >{articles.length > 1
                ? `skip article (${articles.length - 1} skips left)`
                : "no skips remaining"}</button
            >
            {#if src && articles.length > 0}
              <iframe
                {src}
                {title}
                frameborder="0"
                width="100%"
                height="100%"
              />
            {:else}
              <h1>Loading...</h1>
            {/if}
          {/if}
        </div>
      {:else if room.stage === Stage.Guessing}
        <h1>The topic of this round is...</h1>
        <h2>{room.expand?.guessee?.expand?.article.title}</h2>
        <a href="#" on:click={helper}>Confused? Click for instructions.</a>
      {/if}
      <br /><br /><br />
      <button on:click={leave}>Leave</button>
    {/if}
  </main>
</div>

<style>
  iframe {
    border-radius: 1rem;
    box-shadow: rgba(0, 0, 0, 0.18) 0px 2px 8px;

    min-height: 500px;
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
