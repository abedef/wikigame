<script>
    export let data;

    let src = data.src || "https://en.wikipedia.org/wiki/Main_Page/";
    let title = data.title || "Wikipedia, the free encyclopedia";
</script>

<iframe {title} {src} frameborder="0" width="100%" height="100%" />
