<script lang="ts">
    import { page } from "$app/stores";

    import { io } from "socket.io-client";
    import { onMount } from "svelte";

    const socket = io();

    enum State {
        None,
        Registering,
        Joining,
        Hosting,
    }

    let state: State = State.None;

    $: isRegistering = state == State.Registering;

    let code = $page.url.searchParams.get("code") ?? "";
    let codeInput: HTMLInputElement;

    function identifyOneself() {
        session = localStorage.getItem("lietome") ?? "";
        if (session === "") {
            localStorage.setItem("lietome", crypto.randomUUID());
            session = localStorage.getItem("lietome") ?? "";
            if (session === "") {
                alert(
                    "Something's up with your browser's LocalStorage – your performance may be impacted."
                );
            }
        }
        console.log(
            `Trying to register ${
                session === "" ? "<unknown session id>" : session
            }`
        );
        socket.emit("register", session);
    }

    $: if (code.length == 5) {
        state = State.Registering;
        codeInput?.blur();

        socket.emit("join", JSON.stringify({ session, room: code }));
        code = "";

        codeInput?.focus();
        state = State.Registering;
    }

    let session = "";
    let playerAvatar: string;
    let roomCode: string;

    let players: string[] = [];

    socket.on("eventFromServer", (message) => {
        console.log(message);
    });

    socket.on("greet", (message) => {
        console.log(`Identified as ${message}`);
        playerAvatar = message;
    });

    socket.on("room", (message) => {
        console.log(`Granted access to room ${message}`);
        roomCode = message;
    });
    socket.on("membersChanged", (message) => {
        console.log("Updating playerlist");
        players = message;
    });

    socket.on("joined", ({ room, avatar }) => {
        console.log(`Joined ${room} as ${avatar}`);
        roomCode = room;
        playerAvatar = avatar;
    });

    socket.on("error", (message) => {
        alert(message);
    });

    onMount(identifyOneself);
</script>

<svelte:head>
    <style>
        html,
        body {
            height: 100%;
            margin: 0;
        }
    </style>
</svelte:head>

<div class="container">
    <div class="logo">
        <img
            class="logo"
            src="logo.png"
            alt="Lie to Me: The Bullshitting Game"
        />
    </div>

    <main>
        {#if players.length > 0}
            <h4>
                Players: {#each players as player}{player}{/each}
            </h4>
        {/if}

        {#if playerAvatar}
            You are {playerAvatar}
        {/if}

        <div>
            {#if state == State.None}
                <button
                    on:click={() => {
                        state = State.Hosting;
                        socket.emit("host", session);
                    }}>Host</button
                >
                <button
                    on:click={() => {
                        state = State.Joining;
                    }}>Join</button
                >
            {:else}
                {#if state == State.Joining}
                    <div class="roomCodeInput">
                        <label for="roomCode">Enter room code:</label>
                        <input
                            bind:this={codeInput}
                            disabled={isRegistering}
                            bind:value={code}
                            type="text"
                            name="code"
                            id="roomCode"
                            maxlength="5"
                        />
                    </div>
                {:else if state == State.Hosting}
                    <h3>Your room code is {roomCode}</h3>
                {/if}
                <button on:click={() => (state = State.None)}>Cancel</button>
            {/if}
        </div>
    </main>
</div>

<style>
    .roomCodeInput {
        display: flex;
        flex-direction: column;
    }

    h3 {
        text-align: center;
    }

    input {
        text-transform: uppercase;

        text-align: center;

        max-width: 5ch;

        margin: 1rem auto;
    }

    button {
        height: 2rem;
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

    img.logo {
        /* scale: 0.5; */
        max-width: 122px;
    }

    main {
        min-height: 300px;

        display: flex;
        flex-direction: column;

        justify-content: space-evenly;
    }
</style>
