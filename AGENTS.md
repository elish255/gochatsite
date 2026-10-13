<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep the Chatdunia experience in its browser-safe source module and mount it at the index route; this preserves the reference interactions without adding unsupported server services.
- Use the reference Button variants and semantic CSS tokens for reproduced controls; this preserves exact reference layouts while maintaining the shared design system.
- Import original website media through Lovable asset pointers; this preserves the supplied identity without external image hotlinks.
- The reference balance, chat replies, and withdrawal notices are simulations, not real payments; never represent them as a connected financial service.
