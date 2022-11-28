<script lang="ts">
    import { page } from "$app/stores";
    import { state } from "$lib/stores";
    import { slide } from "svelte/transition";

    import { io } from "socket.io-client";
    import { onMount } from "svelte";
    import PlayerAvatar from "$lib/components/PlayerAvatar.svelte";
    import { State } from "$lib/enums";

    const socket = io();

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

        socket.emit("join", { session: $state.session, roomID: code });
        code = "";
        $state.state = State.None;
    }

    let players: string[] = [];

    socket.on("greet", ({ user, avatar }) => {
        console.log(`Identified as ${avatar} (${user})`);

        if ($state.avatar !== "" && $state.session !== "") {
            socket.emit("reintroduce", {
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

    socket.on("room", (message) => {
        console.log(`Granted access to room ${message}`);
        $state.room = message;
    });

    socket.on("members", ({ host, avatars }) => {
        console.log(`Updating member list from ${players} to ${avatars}`);
        players = avatars;
        if (host === $state.session) {
            $state.state = State.Hosting;
        }
    });

    socket.on("joined", ({ host, roomID, avatar }) => {
        console.log(`Joined ${roomID} as ${avatar}`);
        $state.room = roomID;
        $state.avatar = avatar;
        $state.state = $state.session === host ? State.Hosting : State.Joined;
    });

    socket.on("error", (message) => {
        alert(message);
    });

    socket.on("started", () => {
        console.log('Game started');
        $state.state = State.Playing;
    });

    socket.on("advance", ({ nextStage }) => {
        $state.stage = nextStage;
    })

    function host() {
        $state.state = State.Hosting;
        socket.emit("host", $state.session, $state.gameConfig);
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
        socket.emit("leave", $state.session);
    };
    function start() {
        socket.emit("start", $state.room);
    };
    function maybeAdvanceStage() {
        socket.emit("advanceStage");
    };
    function chooseArticle() {
        socket.emit("selectArticle");
    };
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
                <button on:click={maybeAdvanceStage}>advance stage</button>
              </div>
            {/if}
        </div>
    </main>
</div>

<style>
    @import '../lib/components/root.css';
</style>
