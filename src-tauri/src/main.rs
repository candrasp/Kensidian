// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(windows)]
    {
        // Optimasi alokasi RAM WebView2: matikan modul background yang tidak relevan dengan editor offline
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion --renderer-process-limit=1",
        );
    }

    kensidian_lib::run()
}
