<script lang="ts">
	/**
	 * The name is a logotype, not a string: it is drawn here rather than taken
	 * from the message catalogue, because a locale should translate what the game
	 * says, not what it is called. `brand` in the catalogue exists for the places
	 * the name appears inside a sentence.
	 *
	 * It is set the way the template it is named after appears in an article:
	 * bracketed, in the serif face, the brackets a shade back from the words so
	 * they read as punctuation rather than as letters.
	 */
	let { size = 'large' }: { size?: 'large' | 'small' } = $props();
</script>

<!--
	The name must not break across lines, so it cannot be allowed to grow wider
	than the card either. It is ~7.6x its font size, and the card gives a page
	80px to its padding, so 9vw keeps it inside anything down to a 250px screen
	before the ceiling takes over on desktop.
-->
<span
	class="font-serif {size === 'large'
		? 'text-[clamp(1.75rem,9vw,3rem)]'
		: 'text-xl'} whitespace-nowrap"
>
	<span class="text-muted">[</span><span class="text-ink">citation needed</span><span
		class="text-muted">]</span
	>
</span>
