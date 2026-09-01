<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, class: extra = '' }: { children: Snippet; class?: string } = $props();
</script>

<div class="bg-panel border-line shadow-panel w-full rounded-2xl border p-6 sm:p-8 {extra}">
	{@render children()}
</div>
