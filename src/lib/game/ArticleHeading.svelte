<script lang="ts">
	import type { ArticleCard } from '$lib/protocol';

	let { article, href = null }: { article: ArticleCard; href?: string | null } = $props();
</script>

<div class="border-line bg-surface rounded-xl border p-4">
	{#if href}
		<!-- These go out to Wikipedia, not to a route in this app. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			{href}
			target="_blank"
			rel="noreferrer"
			class="decoration-accent font-serif text-2xl break-words underline underline-offset-4"
		>
			{article.title}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{:else}
		<h3 class="font-serif text-2xl break-words">{article.title}</h3>
	{/if}
</div>
