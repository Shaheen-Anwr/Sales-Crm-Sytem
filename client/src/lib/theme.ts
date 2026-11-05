// The theme lives in localStorage ("light", "dark", or absent for "follow the system")
// and is applied as data-theme on <html>, which globals.css keys its colors on.

export const THEME_STORAGE_KEY = "theme"

/** Runs in <head> before the first paint, so the page never flashes the wrong theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`
