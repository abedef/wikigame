<script lang="ts">
	/**
	 * The name set the way the template it is named after appears in an article:
	 * bracketed, in the serif face, the brackets a shade back from the words so
	 * they read as punctuation rather than as letters.
	 */
	let { size = 'large' }: { size?: 'large' | 'small' } = $props();
</script>

<span class="font-serif {size === 'large' ? 'text-4xl sm:text-5xl' : 'text-xl'} whitespace-nowrap">
	<span class="text-muted">[</span><span class="text-ink">citation needed</span><span
		class="text-muted">]</span
	>
</span>
