# Changelog

## [1.1.3](https://github.com/OldKrab/codex-acp/compare/openaide-codex-acp-v1.1.2...openaide-codex-acp-v1.1.3) (2026-08-27)


### Bug Fixes

* project prompts from completed child calls ([#16](https://github.com/OldKrab/codex-acp/issues/16)) ([c816e1c](https://github.com/OldKrab/codex-acp/commit/c816e1c350dcddce436b68425ce5eb250010b794))

## [1.1.2](https://github.com/OldKrab/codex-acp/compare/openaide-codex-acp-v1.1.1...openaide-codex-acp-v1.1.2) (2026-08-27)


### Bug Fixes

* project parent prompts into child sessions ([#13](https://github.com/OldKrab/codex-acp/issues/13)) ([769f8c0](https://github.com/OldKrab/codex-acp/commit/769f8c06583062bd9243ea58b5de2e6a4b18f41f))
* validate configured release tag namespace ([#15](https://github.com/OldKrab/codex-acp/issues/15)) ([2dd8b66](https://github.com/OldKrab/codex-acp/commit/2dd8b66aa035c3401da9e16d7572447c451212f0))

## [1.1.1](https://github.com/OldKrab/codex-acp/compare/openaide-codex-acp-v1.1.0...openaide-codex-acp-v1.1.1) (2026-08-27)


### Bug Fixes

* negotiate OpenAIDE native subagents across SDK ([bfbe845](https://github.com/OldKrab/codex-acp/commit/bfbe8459ce4067d25feb5df773caef1d277ac238))
* negotiate OpenAIDE native subagents across SDK ([9f86878](https://github.com/OldKrab/codex-acp/commit/9f86878db134d8a580478c83601e177b146342d8))

## [1.1.0](https://github.com/OldKrab/codex-acp/compare/openaide-codex-acp-v1.0.0...openaide-codex-acp-v1.1.0) (2026-08-27)


### Features

* Add /goal support ([#240](https://github.com/OldKrab/codex-acp/issues/240)) ([211b7d7](https://github.com/OldKrab/codex-acp/commit/211b7d75e2185c823ca4e8a6069953bcc635d6f2))
* add ACP v1 permission presentation ([#405](https://github.com/OldKrab/codex-acp/issues/405)) ([8ff9e67](https://github.com/OldKrab/codex-acp/commit/8ff9e67f79335345ce53b3157b3d690c191ea027))
* Add message IDs to text session chunks ([#256](https://github.com/OldKrab/codex-acp/issues/256)) ([8309bc2](https://github.com/OldKrab/codex-acp/commit/8309bc26e0e04ac16ffa6629e4854f034ac41404))
* Add more informative permissions approval ([#180](https://github.com/OldKrab/codex-acp/issues/180)) ([7ac77be](https://github.com/OldKrab/codex-acp/commit/7ac77be0d8939fa979e8c838f23d098025e28ce7))
* add native ACP subagent sessions ([#419](https://github.com/OldKrab/codex-acp/issues/419)) ([6067b7f](https://github.com/OldKrab/codex-acp/commit/6067b7f48fe37db82b6ddb9d596a4a4d8cb8a2e4))
* Add review and compact slash commands ([#181](https://github.com/OldKrab/codex-acp/issues/181)) ([26b801d](https://github.com/OldKrab/codex-acp/commit/26b801d94c937be4fccc2f72c3453d73c4450d18))
* add setSessionModel ([a5bd9ba](https://github.com/OldKrab/codex-acp/commit/a5bd9bac99bf4f4f6bf6dce92095188ecea2e266))
* add test ([1fa61a2](https://github.com/OldKrab/codex-acp/commit/1fa61a2a01b0953809fb129652ed02e95a8163a4))
* add versioned context compaction metadata ([#396](https://github.com/OldKrab/codex-acp/issues/396)) ([c4a9311](https://github.com/OldKrab/codex-acp/commit/c4a9311f60a638e3a4b03a475afff1d7678e594f))
* align typed session failures with AIR protocol ([#393](https://github.com/OldKrab/codex-acp/issues/393)) ([e4fb92f](https://github.com/OldKrab/codex-acp/commit/e4fb92fffd8b8b9db9b40591ccbdb375c9f3f525))
* change model encoding LLM-21851 ([d9a254e](https://github.com/OldKrab/codex-acp/commit/d9a254e36873adcbb4d80c3611eacc6150ef8047))
* deploy releases to S3 CDN ([9ae31c9](https://github.com/OldKrab/codex-acp/commit/9ae31c91f0a4ee27eab8abaad3c3eb4c70c0bdd7))
* expose model config options ([#154](https://github.com/OldKrab/codex-acp/issues/154)) ([b065e65](https://github.com/OldKrab/codex-acp/commit/b065e654776f4f2fbe20a375d836d7e01defa353))
* expose permission mode kinds ([#430](https://github.com/OldKrab/codex-acp/issues/430)) ([50f69e5](https://github.com/OldKrab/codex-acp/commit/50f69e57ca761ccafd2ca29de7fb591068277516))
* expose provider-neutral ACP goal extension ([#371](https://github.com/OldKrab/codex-acp/issues/371)) ([49d7694](https://github.com/OldKrab/codex-acp/commit/49d7694e94351a5e57e2e4a8033f2216611bb841))
* expose typed session failures for AIR ([#383](https://github.com/OldKrab/codex-acp/issues/383)) ([54987e1](https://github.com/OldKrab/codex-acp/commit/54987e1c4a4f878af9afad96ec8b6b0b48c7045e))
* harden release pipeline against hangs and e2e flakes ([#413](https://github.com/OldKrab/codex-acp/issues/413)) ([39af81c](https://github.com/OldKrab/codex-acp/commit/39af81c29b79a85f878db096f9cb593b6d1c7429))
* implement configurable LLM providers ([#272](https://github.com/OldKrab/codex-acp/issues/272)) ([24c35d2](https://github.com/OldKrab/codex-acp/commit/24c35d2c45ce10c7b73a9b0600f7223aa5d44bf5))
* Implement session/close ([#177](https://github.com/OldKrab/codex-acp/issues/177)) ([04b7d03](https://github.com/OldKrab/codex-acp/commit/04b7d03104a4d93f1ec9ced41ac58b7fe9254f98))
* LLM-22668 add Mode selector ([b464ef1](https://github.com/OldKrab/codex-acp/commit/b464ef1d1638f421be86c68ac8bf3774097d9ae4))
* LLM-22811 Send manually added attachments ([ca86a2f](https://github.com/OldKrab/codex-acp/commit/ca86a2f9c4ad1f9be15799b40a6546fc2ffec433))
* LLM-26878 Add “Fast” mode for Codex-agent ([#133](https://github.com/OldKrab/codex-acp/issues/133)) ([64d3bc2](https://github.com/OldKrab/codex-acp/commit/64d3bc296ed995c60b6facafd793092c4abcf2ba))
* Propagate thread info updates ([#159](https://github.com/OldKrab/codex-acp/issues/159)) ([71d7889](https://github.com/OldKrab/codex-acp/commit/71d7889888b7184e0a16485e15fc9c550aac4b29))
* report changed files to AIR ([#403](https://github.com/OldKrab/codex-acp/issues/403)) ([e305394](https://github.com/OldKrab/codex-acp/commit/e305394d3f001f21e600597f41a3bee3d4530762))
* Stream reasoning events as agent thoughts ([#182](https://github.com/OldKrab/codex-acp/issues/182)) ([90b5164](https://github.com/OldKrab/codex-acp/commit/90b5164257c271668a19a3e892c8aaa4ad3f0bde))
* Support ACP additional directories ([#191](https://github.com/OldKrab/codex-acp/issues/191)) ([27fb950](https://github.com/OldKrab/codex-acp/commit/27fb950c1a0790b92015452b9d275a7df236da05))
* support device code authentication via URL elicitation ([#347](https://github.com/OldKrab/codex-acp/issues/347)) ([5d40f74](https://github.com/OldKrab/codex-acp/commit/5d40f745bdfa210c314783c320167d1a13c88224))
* support replacing goals through ACP control ([#376](https://github.com/OldKrab/codex-acp/issues/376)) ([0d45a13](https://github.com/OldKrab/codex-acp/commit/0d45a13c2618e8175a24d0bb080a482c7920f291))
* switch providers for loaded Codex sessions ([#404](https://github.com/OldKrab/codex-acp/issues/404)) ([47b57da](https://github.com/OldKrab/codex-acp/commit/47b57da5641a04df9aeeedc254a3aef53a9497da))


### Bug Fixes

* /status shouldn't display account usage for gateway auth ([#138](https://github.com/OldKrab/codex-acp/issues/138)) ([fe69fd8](https://github.com/OldKrab/codex-acp/commit/fe69fd86533d95a6e9feded07ce3cd9f0b3d7ea5))
* add entitlements for Bun executable on macOS ([ab1cd10](https://github.com/OldKrab/codex-acp/commit/ab1cd10b6fe58d1042d2842501b81b3b25fa048c))
* automatically log out on corrupted auth.json ([#195](https://github.com/OldKrab/codex-acp/issues/195)) ([6e0d779](https://github.com/OldKrab/codex-acp/commit/6e0d779cd60c8261602345658f995c92488c0849))
* automatically recover from corrupted auth.json ([#173](https://github.com/OldKrab/codex-acp/issues/173)) ([dec41b6](https://github.com/OldKrab/codex-acp/commit/dec41b668ea4ce4919c483640c5feee5f83ef405))
* check authentication on session resume ([2531a57](https://github.com/OldKrab/codex-acp/commit/2531a575973523d95cad60c933c977cc0b20e023))
* close codex connection on if stdin is closed ([451f7af](https://github.com/OldKrab/codex-acp/commit/451f7afb9e286e20687ec626cbf3968a4f05c937))
* disable session_config in JB IDEs v2026.1 ([#179](https://github.com/OldKrab/codex-acp/issues/179)) ([9195f8c](https://github.com/OldKrab/codex-acp/commit/9195f8cc0331a2017c30b3b03ccc52fc6123b7d8))
* Do not send reason as content on permission request ([#171](https://github.com/OldKrab/codex-acp/issues/171)) ([ca9de27](https://github.com/OldKrab/codex-acp/commit/ca9de27d6349d8ee76d6323aa5cd3b02d1b67ef9))
* Don't update tool call content for permissions requests ([#210](https://github.com/OldKrab/codex-acp/issues/210)) ([2e94b2b](https://github.com/OldKrab/codex-acp/commit/2e94b2bb4ef9944b5483e4c3a235a10d76523669))
* Emit plan contents in plan mode ([#326](https://github.com/OldKrab/codex-acp/issues/326)) ([bae159c](https://github.com/OldKrab/codex-acp/commit/bae159c91d01d43af4d6e00b425592f028d25ade)), closes [#307](https://github.com/OldKrab/codex-acp/issues/307)
* ensure codex app-server is started with node ([#135](https://github.com/OldKrab/codex-acp/issues/135)) ([9fd8246](https://github.com/OldKrab/codex-acp/commit/9fd8246edf908b7eb3f61e671482583f59e66947))
* explicitly pass model provider on session resume ([#139](https://github.com/OldKrab/codex-acp/issues/139)) ([5e99c28](https://github.com/OldKrab/codex-acp/commit/5e99c284796e02537202a3e6b2bc88a3ddf3a051))
* fall back to inline image data for internal URIs ([#228](https://github.com/OldKrab/codex-acp/issues/228)) ([37a98b3](https://github.com/OldKrab/codex-acp/commit/37a98b3c5d31dbd81d84951cde60a0f4078ab695))
* fallback to default reasoning effort if codex doesn't provide current value ([dff840c](https://github.com/OldKrab/codex-acp/commit/dff840c8a312df1e2b22fb5c9217e2a35f300eaf))
* filter session list before pagination ([4f7ab12](https://github.com/OldKrab/codex-acp/commit/4f7ab1278d45398448f96c3e7ff310c6e6a40829))
* forward unregistered slash commands ([#281](https://github.com/OldKrab/codex-acp/issues/281)) ([9c55411](https://github.com/OldKrab/codex-acp/commit/9c554115eab352cb9dfb1e771f7453965672c5fe))
* Handle more web search events ([#184](https://github.com/OldKrab/codex-acp/issues/184)) ([0c517b0](https://github.com/OldKrab/codex-acp/commit/0c517b067cc12408aefb9d5574726db0edf3a59c))
* handle project MCP config conflicts ([#322](https://github.com/OldKrab/codex-acp/issues/322)) ([df18fea](https://github.com/OldKrab/codex-acp/commit/df18fea2cf52beda312b6fc4acdad5eca7618212))
* Handle sleep thread items in history fallback ([#216](https://github.com/OldKrab/codex-acp/issues/216)) ([8f4b200](https://github.com/OldKrab/codex-acp/commit/8f4b20038ea6c9e7a6f34a6f821fc07e79305a58))
* handle warning ([ccbff66](https://github.com/OldKrab/codex-acp/commit/ccbff66626c8a642ae064059b4ab56445b1c66d2))
* Ignore Guardian warning notifications ([#200](https://github.com/OldKrab/codex-acp/issues/200)) ([a81e071](https://github.com/OldKrab/codex-acp/commit/a81e071bf01b2e043e0381ee49ec1e950ac82b7a))
* ignore MCP's with conflicted name to prevent config corruption and codex crash ([#144](https://github.com/OldKrab/codex-acp/issues/144)) ([7271088](https://github.com/OldKrab/codex-acp/commit/72710880a8fe16367c64b2790f7548bbc421675f))
* implement proper sdk method ([bfd6557](https://github.com/OldKrab/codex-acp/commit/bfd6557a4d4bd88bad1a7559db23fdf99eb60c5f))
* Include read file path in tool title ([#158](https://github.com/OldKrab/codex-acp/issues/158)) ([f799cc8](https://github.com/OldKrab/codex-acp/commit/f799cc850e74f4a5d93a481d995fb9c747f55171))
* include stderr in process exceptions ([#212](https://github.com/OldKrab/codex-acp/issues/212)) ([f7d1125](https://github.com/OldKrab/codex-acp/commit/f7d112577108b7dced6f4879afd3109dbfa02d6c))
* keep exec command fallback tracking consistent ([#220](https://github.com/OldKrab/codex-acp/issues/220)) ([302e995](https://github.com/OldKrab/codex-acp/commit/302e9959d2e87da27f942263efb1639ec3a4a414))
* kill stalled apt from outside and serialize the unit suite ([51e011f](https://github.com/OldKrab/codex-acp/commit/51e011fef27b812b238bf29c2a815f8ad149fa87))
* LLM-23018 Search titles not displayed for file glob rg commands ([a853d3f](https://github.com/OldKrab/codex-acp/commit/a853d3f779e49d0322f8cc77570a30764d52b075))
* make auth request optional ([dbcfb9e](https://github.com/OldKrab/codex-acp/commit/dbcfb9e92af3f499dd1c56618d34d50cea53dd75))
* Map Codex image events to ACP tool calls ([#185](https://github.com/OldKrab/codex-acp/issues/185)) ([7080ea7](https://github.com/OldKrab/codex-acp/commit/7080ea75f37c7efc2143ec2febd0df66055dbc32))
* Map collab agent tool call events ([#223](https://github.com/OldKrab/codex-acp/issues/223)) ([a193548](https://github.com/OldKrab/codex-acp/commit/a1935481248805959e7739d86b7b682a5fa00ce7)), closes [#222](https://github.com/OldKrab/codex-acp/issues/222)
* match CLI session ordering ([67b8fcf](https://github.com/OldKrab/codex-acp/commit/67b8fcf614b6964d5c715599d29ace0a4f03f99a))
* normalize cwd filters for Windows sessions ([#377](https://github.com/OldKrab/codex-acp/issues/377)) ([145ebba](https://github.com/OldKrab/codex-acp/commit/145ebba5d2030b4aa6d19cbb89d190b7b498d454))
* notarize macOS binaries via zip archive ([de7a887](https://github.com/OldKrab/codex-acp/commit/de7a8879be71fde823950dc27e8b3d2373fafe00))
* pass SERVICE_ACCOUNT env vars to signing steps ([b96145e](https://github.com/OldKrab/codex-acp/commit/b96145efd8e010793df0a476167eedf25d260aad))
* reasoning.summary verification error ([b36785f](https://github.com/OldKrab/codex-acp/commit/b36785f49ed7d8ba700492baa14a0d88b745e602))
* reasoning.summary verification error only for KEY authorization type ([21bcfc5](https://github.com/OldKrab/codex-acp/commit/21bcfc58b2dbf2e7cc151eca26ce7f33731088c0))
* rebase ([0a0d0c0](https://github.com/OldKrab/codex-acp/commit/0a0d0c036ff696d957b7e951fdfbb43e6c5e0751))
* remove apt-get update, add retry for zip install ([c845e1a](https://github.com/OldKrab/codex-acp/commit/c845e1ad7c5c6435a964994822d777c51fd94496))
* remove extra switch case check ([097da94](https://github.com/OldKrab/codex-acp/commit/097da94c31d966e0242cf04b8119f6e38be6a291))
* remove fast session config option if model doesn't support it ([#254](https://github.com/OldKrab/codex-acp/issues/254)) ([fbc8f84](https://github.com/OldKrab/codex-acp/commit/fbc8f84cb58269c26a2ec620da2ac11a7bfed517))
* Remove sub-agent sources from session listing ([#235](https://github.com/OldKrab/codex-acp/issues/235)) ([374e684](https://github.com/OldKrab/codex-acp/commit/374e684ec7c69663843f3932684a057b0270a113)), closes [#234](https://github.com/OldKrab/codex-acp/issues/234)
* Report agent info during initialization ([#152](https://github.com/OldKrab/codex-acp/issues/152)) ([fac4afb](https://github.com/OldKrab/codex-acp/commit/fac4afb92aef30ec27517272e609ac65c8178484))
* report AIR file changes from audit turns ([a2152e2](https://github.com/OldKrab/codex-acp/commit/a2152e2d337291ca2f8dd7f9cc8b68a2355ce955))
* resolve post-update type and test regressions ([626b1f6](https://github.com/OldKrab/codex-acp/commit/626b1f6f6a7cb1c2c7347d9efc9f8702b4040323))
* Restore native provider state after overrides ([#400](https://github.com/OldKrab/codex-acp/issues/400)) ([90ed600](https://github.com/OldKrab/codex-acp/commit/90ed60077a928a02ce795a35c90c2ed3a8af381e))
* resume paused goals through ACP control ([#374](https://github.com/OldKrab/codex-acp/issues/374)) ([4bb290f](https://github.com/OldKrab/codex-acp/commit/4bb290f5bd3d48d6b07338d3634cc13fe9c1b49e))
* revert sandbox, approvalPolicy override ([b5419a4](https://github.com/OldKrab/codex-acp/commit/b5419a4b98dd9b4503a9c9de1e42621fa43e517b))
* revert sandbox, approvalPolicy override, revert mcp test ([8437e56](https://github.com/OldKrab/codex-acp/commit/8437e56ba552a7656c65f07a0795b1bda4e469f7))
* right-size the apt timeouts so a slow mirror still finishes ([86e0772](https://github.com/OldKrab/codex-acp/commit/86e0772204a07d6fc4a8853c523ceb5006431f88))
* Sanitize ACP MCP server names for Codex ([#172](https://github.com/OldKrab/codex-acp/issues/172)) ([e698674](https://github.com/OldKrab/codex-acp/commit/e698674ae835d80fdfe5dbffa1eaae9db549ba11))
* send approval reason in the content instead of title ([2f47d87](https://github.com/OldKrab/codex-acp/commit/2f47d878e221b96840df6a82622be60f2415b34d))
* send elicitation complete event for device authentication ([#421](https://github.com/OldKrab/codex-acp/issues/421)) ([6b01a28](https://github.com/OldKrab/codex-acp/commit/6b01a28c4706762a9663914845c51cd605cde339))
* send unsigned binaries to codesign service for proper signing ([2abb8f7](https://github.com/OldKrab/codex-acp/commit/2abb8f7545406f7c085da1e1a48f209ac949bc44))
* separate signing and notarization steps for macOS ([9d6ced3](https://github.com/OldKrab/codex-acp/commit/9d6ced3bce85130b02f2e5058ccb39f515ea4be6))
* setModel shouldn't change the preferred model globally ([05423e1](https://github.com/OldKrab/codex-acp/commit/05423e17eaf8e27e71c61bd9fc6d03e58f5b53e3))
* Skip ChatGPT login when already authenticated ([#247](https://github.com/OldKrab/codex-acp/issues/247)) ([373c42d](https://github.com/OldKrab/codex-acp/commit/373c42d548316ff76be68061f9c0a9e121e01bcc)), closes [#243](https://github.com/OldKrab/codex-acp/issues/243)
* skip diagnostics for filtered sessions ([b5c0a79](https://github.com/OldKrab/codex-acp/commit/b5c0a796dd909d124423fb7740e6ea122f6986c8))
* Stop emitting "Conversation interrupted" message ([#358](https://github.com/OldKrab/codex-acp/issues/358)) ([efa3789](https://github.com/OldKrab/codex-acp/commit/efa3789c3909838590f2f7cf24682ec4a0e987e4))
* suppress late session updates after close ([#418](https://github.com/OldKrab/codex-acp/issues/418)) ([ae048a6](https://github.com/OldKrab/codex-acp/commit/ae048a66e485bae5184cb87ae75fcfa1549b69d5))
* test ([c2a871b](https://github.com/OldKrab/codex-acp/commit/c2a871b7912dfb82a617bed7c470e4ead6e26e0d))
* test ([4cc0976](https://github.com/OldKrab/codex-acp/commit/4cc09762665e0104b7a08391bdd1765c5b47826c))
* test ([e654a4a](https://github.com/OldKrab/codex-acp/commit/e654a4a938a4a7c713f0a3d7683d524fd736b965))
* test, image capabilities ([8c5da54](https://github.com/OldKrab/codex-acp/commit/8c5da549934bd129da1263bb977cc5ac44d9aede))
* Track configured auth for turn errors ([#245](https://github.com/OldKrab/codex-acp/issues/245)) ([b7c78dd](https://github.com/OldKrab/codex-acp/commit/b7c78dd561cbee1c36dd1134f7c8550c65410e13))
* typecheck ([f92dcd8](https://github.com/OldKrab/codex-acp/commit/f92dcd8d228895d57e907aa081279b5b13f2cf4d))
* uncomment code ([36e7b2f](https://github.com/OldKrab/codex-acp/commit/36e7b2f45c2f62c2a286413dd7190fad58b2f4b7))
* update codex to 0.148.0 ([#410](https://github.com/OldKrab/codex-acp/issues/410)) ([3616954](https://github.com/OldKrab/codex-acp/commit/3616954dc0e24af83b512adb618d7acbc5b98de5))
* use --no-autostart for GPG in CI ([6114ade](https://github.com/OldKrab/codex-acp/commit/6114ade8e8758fa8bc7bda7b710f234242c0f2ce))
* use bun run test instead of bun test in CI ([3229a8e](https://github.com/OldKrab/codex-acp/commit/3229a8e9aa5316639368abc324f2573706508029))
* use configured model provider on session resume ([#224](https://github.com/OldKrab/codex-acp/issues/224)) ([54dcc04](https://github.com/OldKrab/codex-acp/commit/54dcc0485e3edd64c8b326854fa77ebb27c779bf))
* use correct content type for macOS binary signing ([968d72f](https://github.com/OldKrab/codex-acp/commit/968d72f36629c62a94e6cd621008edd461930dec))
* use original codesign-client filename for checksum verification ([b8ca0e9](https://github.com/OldKrab/codex-acp/commit/b8ca0e911f7aabe0d7a8603f77faf869d25d912f))

## [1.7.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.6.2...v1.7.0) (2026-08-27)


### Features

* add ACP v1 permission presentation ([#405](https://github.com/agentclientprotocol/codex-acp/issues/405)) ([8ff9e67](https://github.com/agentclientprotocol/codex-acp/commit/8ff9e67f79335345ce53b3157b3d690c191ea027))
* add native ACP subagent sessions ([#419](https://github.com/agentclientprotocol/codex-acp/issues/419)) ([6067b7f](https://github.com/agentclientprotocol/codex-acp/commit/6067b7f48fe37db82b6ddb9d596a4a4d8cb8a2e4))
* expose permission mode kinds ([#430](https://github.com/agentclientprotocol/codex-acp/issues/430)) ([50f69e5](https://github.com/agentclientprotocol/codex-acp/commit/50f69e57ca761ccafd2ca29de7fb591068277516))


### Bug Fixes

* report AIR file changes from audit turns ([a2152e2](https://github.com/agentclientprotocol/codex-acp/commit/a2152e2d337291ca2f8dd7f9cc8b68a2355ce955))
* send elicitation complete event for device authentication ([#421](https://github.com/agentclientprotocol/codex-acp/issues/421)) ([6b01a28](https://github.com/agentclientprotocol/codex-acp/commit/6b01a28c4706762a9663914845c51cd605cde339))
* suppress late session updates after close ([#418](https://github.com/agentclientprotocol/codex-acp/issues/418)) ([ae048a6](https://github.com/agentclientprotocol/codex-acp/commit/ae048a66e485bae5184cb87ae75fcfa1549b69d5))

## [1.6.2](https://github.com/agentclientprotocol/codex-acp/compare/v1.6.1...v1.6.2) (2026-08-19)


### Bug Fixes

* right-size the apt timeouts so a slow mirror still finishes ([86e0772](https://github.com/agentclientprotocol/codex-acp/commit/86e0772204a07d6fc4a8853c523ceb5006431f88))

## [1.6.1](https://github.com/agentclientprotocol/codex-acp/compare/v1.6.0...v1.6.1) (2026-08-19)


### Bug Fixes

* kill stalled apt from outside and serialize the unit suite ([51e011f](https://github.com/agentclientprotocol/codex-acp/commit/51e011fef27b812b238bf29c2a815f8ad149fa87))

## [1.6.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.5.1...v1.6.0) (2026-08-19)


### Features

* harden release pipeline against hangs and e2e flakes ([#413](https://github.com/agentclientprotocol/codex-acp/issues/413)) ([39af81c](https://github.com/agentclientprotocol/codex-acp/commit/39af81c29b79a85f878db096f9cb593b6d1c7429))

## [1.5.1](https://github.com/agentclientprotocol/codex-acp/compare/v1.5.0...v1.5.1) (2026-08-19)


### Bug Fixes

* update codex to 0.148.0 ([#410](https://github.com/agentclientprotocol/codex-acp/issues/410)) ([3616954](https://github.com/agentclientprotocol/codex-acp/commit/3616954dc0e24af83b512adb618d7acbc5b98de5))

## [1.5.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.4.0...v1.5.0) (2026-08-17)


### Features

* switch providers for loaded Codex sessions ([#404](https://github.com/agentclientprotocol/codex-acp/issues/404)) ([47b57da](https://github.com/agentclientprotocol/codex-acp/commit/47b57da5641a04df9aeeedc254a3aef53a9497da))

## [1.4.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.3.0...v1.4.0) (2026-08-16)


### Features

* report changed files to AIR ([#403](https://github.com/agentclientprotocol/codex-acp/issues/403)) ([e305394](https://github.com/agentclientprotocol/codex-acp/commit/e305394d3f001f21e600597f41a3bee3d4530762))

## [1.3.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.2.0...v1.3.0) (2026-08-14)


### Features

* add versioned context compaction metadata ([#396](https://github.com/agentclientprotocol/codex-acp/issues/396)) ([c4a9311](https://github.com/agentclientprotocol/codex-acp/commit/c4a9311f60a638e3a4b03a475afff1d7678e594f))
* align typed session failures with AIR protocol ([#393](https://github.com/agentclientprotocol/codex-acp/issues/393)) ([e4fb92f](https://github.com/agentclientprotocol/codex-acp/commit/e4fb92fffd8b8b9db9b40591ccbdb375c9f3f525))


### Bug Fixes

* Restore native provider state after overrides ([#400](https://github.com/agentclientprotocol/codex-acp/issues/400)) ([90ed600](https://github.com/agentclientprotocol/codex-acp/commit/90ed60077a928a02ce795a35c90c2ed3a8af381e))

## [1.2.0](https://github.com/agentclientprotocol/codex-acp/compare/v1.1.14...v1.2.0) (2026-08-11)


### Features

* expose typed session failures for AIR ([#383](https://github.com/agentclientprotocol/codex-acp/issues/383)) ([54987e1](https://github.com/agentclientprotocol/codex-acp/commit/54987e1c4a4f878af9afad96ec8b6b0b48c7045e))


### Bug Fixes

* normalize cwd filters for Windows sessions ([#377](https://github.com/agentclientprotocol/codex-acp/issues/377)) ([145ebba](https://github.com/agentclientprotocol/codex-acp/commit/145ebba5d2030b4aa6d19cbb89d190b7b498d454))
