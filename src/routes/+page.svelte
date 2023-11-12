<script lang="ts">
    import { page } from "$app/stores";
    import { state } from "$lib/stores";
    import { slide } from "svelte/transition";

    import { io } from "socket.io-client";
    import { onMount } from "svelte";
    import PlayerAvatar from "$lib/components/PlayerAvatar.svelte";
    import { State } from "$lib/enums";
    import { SocketEvent } from "$lib/enums";

    const socket = io();

    let timer = 0;
    let timerId: NodeJS.Timeout;
    const startTimer = () => timerId = setInterval(() => timer += 1, 1000);
    const stopTimer = () => clearInterval(timerId);
    const restartTimer = () => {
        stopTimer();
        startTimer();
    };

type GameArticle = {
    id: string;
    url: string;
    title: string;
  };

  let articles: GameArticle[] = [];
  $: src = articles.length > 0 ? articles.at(0)?.url : '';
  $: title = articles.length > 0 ? articles.at(0)?.title: "";

    $: isChilling = $state.state === State.None;
    $: isRegistering = $state.state === State.Registering;
    $: isJoining = $state.state === State.Joining;
    $: hasJoined = $state.state === State.Joined;
    $: isHosting = $state.state === State.Hosting;
    $: isPlaying = $state.state === State.Playing;

    onMount(() => {
        if ($state.room.length > 0 && $state.session.length > 0) {
            code = $state.room;
        }
    });

    // TODO use promises in the socket stuff to make sure no race conditions are encountered

    // TODO if code is provided should redirect to eliminate the query parameter (or make the query parameter not fuck shit up)
    let code = $page.url.searchParams.get("code") ?? "";
    let codeInput: HTMLInputElement;

    $: if (code.length === 5) {
        codeInput?.blur();
        $state.state = State.Registering;

        socket.emit(SocketEvent.Join, { session: $state.session, roomID: code });
        code = "";
        $state.state = State.None;
    }

    let players: string[] = [];

    socket.on(SocketEvent.Greet, ({ user, avatar }) => {
        console.log(`Identified as ${avatar} (${user})`);

        if ($state.avatar !== "" && $state.session !== "") {
            socket.emit(SocketEvent.Reintroduce, {
                user: $state.session,
                avatar: $state.avatar,
            });
            $state.avatar = "";
            $state.session = "";
        } else {
            $state.avatar = avatar;
            $state.session = user;
        }
    });

    socket.on(SocketEvent.Room, (message) => {
        console.log(`Granted access to room ${message}`);
        $state.room = message;
    });

    socket.on(SocketEvent.Members, ({ host, avatars }) => {
        console.log(`Updating member list from ${players} to ${avatars}`);
        players = avatars;
        if (host === $state.session) {
            $state.state = State.Hosting;
        }
    });

    socket.on(SocketEvent.Joined, ({ host, roomID, avatar }) => {
        console.log(`Joined ${roomID} as ${avatar}`);
        $state.room = roomID;
        $state.avatar = avatar;
        $state.state = $state.session === host ? State.Hosting : State.Joined;
    });

    socket.on(SocketEvent.Error, (message) => {
        alert(message);
    });

    socket.on(SocketEvent.Started, (randomArticles: GameArticle[]) => {
        console.log('Game started');
        console.log(randomArticles);
        articles = randomArticles;
        $state.state = State.Playing;
        startTimer();
    });

    socket.on(SocketEvent.Advance, ({ nextStage }) => {
        $state.stage = nextStage;
    })

    function host() {
        $state.state = State.Hosting;
        socket.emit(SocketEvent.Host, $state.session, $state.gameConfig);
    };
    function join() {
        $state.state = State.Joining;
    };
    function cancel() {
        $state.state = State.None;
        $state.room = "";
        $state.avatar = "";
        players = [];
    };
    function leave() {
        $state.state = State.None;
        $state.room = "";
        $state.avatar = "";
        players = [];
        socket.emit(SocketEvent.Leave, $state.session);
    };
    function start() {
        socket.emit(SocketEvent.Start, $state.room);
    };
    function maybeAdvanceStage() {
        socket.emit(SocketEvent.AdvanceStage);
    };
    function chooseArticle() {
        socket.emit(SocketEvent.SelectArticle, articles.at(0));
    };
    function skipArticle() {
        if (articles.length > 1) articles = articles.slice(1);
        // TODO Handle "out of articles" situation
    }
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
        {#if players.length > 0}
            <h4>Players:</h4>
            <div class="funfun">
                {#each players as player, i}
                    <PlayerAvatar avatar={player} />
                {/each}
            </div>
        {/if}

        {#if $state.state === State.Hosting || $state.state === State.Joined}
            <div class="avatar">
                <h5>
                    {$state.avatar}
                </h5>
                <h6>You</h6>
            </div>
        {/if}

        <div>
            {#if isChilling}
                <button on:click={host}>Host</button>
                <button on:click={join}>Join</button>
            {:else if isHosting || hasJoined}
                <div transition:slide class="roomCodeDisplay">
                    <h3>Room code:</h3>
                    <h4>{$state.room}</h4>
                </div>
                <div>
                    <button disabled={($state.state !== State.Hosting) || (players.length < 3)} on:click={start}>Start</button>
                    <button on:click={leave}>Leave</button>
                </div>
            {:else if isJoining}
                <div transition:slide class="roomCodeInput">
                    <label for="roomCode">Enter room code:</label>
                    <input
                        bind:this={codeInput}
                        disabled={isRegistering}
                        bind:value={code}
                        type="text"
                        pattern="\d*"
                        name="code"
                        id="roomCode"
                        maxlength="5"
                        placeholder="•••••"
                    />
                    <div>
                        <button on:click={cancel}>Cancel</button>
                    </div>
                </div>
            {:else if isPlaying}
              <div>
                <button on:click={chooseArticle}>pick article</button>
                <button disabled={!(articles.length > 1)} on:click={skipArticle}>{articles.length > 1 ? 'skip article' : 'no skips remaining'}</button>
                <button on:click={maybeAdvanceStage}>advance stage</button>
              </div>
              <h1>Players are making their selections...</h1>
              <h2>{timer}</h2>
              {#if src}
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
    </main>
</div>

<style>
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

div.avatar h5 {
    margin-bottom: 0;
}

div.avatar h6 {
    margin-top: 0;
}
</style>
