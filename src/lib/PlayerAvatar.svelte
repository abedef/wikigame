<div class="player">
    <h1 transition:fade>{avatar}</h1>
</div>

<script lang="ts">
    import { fade } from "svelte/transition";
    export let avatar: string;
</script>