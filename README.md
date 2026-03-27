# @bbauti/warframe-mcp

A Model Context Protocol server for Warframe — look up items, weapons, warframes, mods, market prices, drop sources, build recommendations, world state, and more.

## Installation

### Claude Code

```bash
claude mcp add warframe-mcp -- npx @bbauti/warframe-mcp
```

### Manual (claude_desktop_config.json or other MCP clients)

```json
{
  "mcpServers": {
    "warframe-mcp": {
      "command": "npx",
      "args": ["@bbauti/warframe-mcp"]
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_item` | Search any item by name (weapons, warframes, mods, resources) |
| `get_weapon` | Detailed weapon stats: damage, crit, status, fire rate, riven disposition |
| `get_warframe` | Warframe stats: health, shields, armor, energy, abilities, passive |
| `get_mod` | Mod info with stats at each rank, drain, polarity, rarity |
| `search_drops` | Find where items drop: enemies, missions, relics, drop rates |
| `farm_guide` | Farming guide with drop sources ranked by efficiency and buy-vs-farm comparison |
| `check_market` | warframe.market prices: median, range, volume, trends, live sell offers |
| `recommend_build` | Optimal mod builds calculated with real damage formulas |
| `search_builds` | Search Overframe.gg for community-voted public builds with optional keyword filtering |
| `compare_weapons` | Side-by-side comparison of 2-4 weapons with optional DPS calculations |
| `search_wiki` | Search the Warframe Wiki for detailed game info |
| `search_community` | Search r/Warframe for discussions, builds, and tier lists |
| `world_state` | Live game state: fissures, sortie, invasions, Baro, cycles, events |

## Resources

| Resource | Description |
|----------|-------------|
| `damage-types` | Reference for all damage types and their properties |
| `status-effects` | Reference for all status effects and their behavior |

## Prompts

| Prompt | Description |
|--------|-------------|
| `warframe-expert` | Activates a Warframe expert persona with deep game knowledge |
| `build-advisor` | Guides through weapon or warframe build optimization |

## Credits

Data sourced from:

- [warframe-items](https://github.com/WFCD/warframe-items) — item and mod data
- [Warframe Community API](https://docs.warframestat.us/) — world state and drop data
- [warframe.market](https://warframe.market/) — market prices and trade data
- [Warframe Wiki](https://warframe.fandom.com/) — game documentation
- [r/Warframe](https://www.reddit.com/r/Warframe/) — community discussions

Built with [xmcp](https://xmcp.dev).

## License

MIT
