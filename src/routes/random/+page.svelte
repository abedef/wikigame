<script lang="ts">
    import Dice from "$lib/dice.svelte";
    export let data;

    let src = `${data.src}`;

    function lockIn() {
        // Send src and title to server via websockets
    }
</script>

<!-- NOTE the rel property makes sure this page is fully reloaded (more specifically, makes sure the corresponding PageServerLoad function is re-run) -->
<nav>
    <button disabled class="dice" on:click={lockIn}>LOCK IN</button>
    <a class="dice" href="/random" rel="external"><Dice /></a>
</nav>

<div>
    {#if src}
        <iframe
            {src}
            title="Random article | Wikipedia"
            frameborder="0"
            width="100%"
            height="100%"
        />
    {:else}
        <h1>Loading...</h1>
    {/if}
</div>

<style>
    nav {
        height: 3rem;

        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }
    iframe {
        border-radius: 1rem;
    }
    div {
        position: absolute;
        top: 4rem;
        bottom: 1rem;
        left: 1rem;
        right: 1rem;
    }

    button.dice {
        margin-left: 1rem;
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

        flex: 1;

        font-size: smaller;

        text-align: center;
    }
</style>
