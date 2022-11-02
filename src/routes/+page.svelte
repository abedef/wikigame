<script lang="ts">
    import type { PageServerData } from "./$types";

    export let data: PageServerData;
</script>

{data.name}
{data.count}
<h1>Welcome SvelteKit</h1>
<p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>

<form action="/">
    <input type="submit" value="Host" formaction="?/host" />
    <input type="submit" value="Join" formaction="?/join" />
</form>
