window.ballAPI.onLand(() => {
    const el = document.getElementById("ball");
    el.classList.remove("bounce");
    void el.offsetWidth;
    el.classList.add("bounce");
});