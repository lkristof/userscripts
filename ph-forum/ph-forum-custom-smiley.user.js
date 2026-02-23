// ==UserScript==
// @name         Prohardver Fórum – Extra Smilies
// @namespace    https://github.com/lkristof/userscripts
// @version      1.0.0
// @description  Extra smiley sor.
// @icon         https://cdn.rios.hu/design/ph/logo-favicon.png
//
// @match        https://prohardver.hu/tema/*
// @match        https://prohardver.hu/privat/*
// @match        https://mobilarena.hu/tema/*
// @match        https://mobilarena.hu/privat/*
// @match        https://logout.hu/tema/*
// @match        https://logout.hu/privat/*
// @match        https://fototrend.hu/tema/*
// @match        https://fototrend.hu/privat/*
//
// @homepageURL  https://github.com/lkristof/userscripts
// @supportURL   https://github.com/lkristof/userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-custom-smiley.user.js
// @updateURL    https://raw.githubusercontent.com/lkristof/userscripts/main/ph-forum-custom-smiley.user.js
//
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const EXTRA_SMILIES = [
        { code: ':abashed:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xbjsjrfku7m0up6y_abashed.gif' },
        { code: ':aggodik:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ougi96agmsbvcuxy_aggodik.gif' },
        { code: ':bad:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ihifbk0cpt5kr74j_bad.gif' },
        { code: ':bigeyed:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l4oaf9xntn9hxvqg_bigeyed.gif' },
        { code: ':bok:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pzw9hgej6dizwzof_bok.gif' },
        { code: ':bok2:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zzalkc4e5rv7hxcq_bok2.gif' },
        { code: ':angel:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_lhh21mbyli1udl7r_angel.gif' },
        { code: ':bow:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ctdyqosir1yivbfw_bow.gif' },
        { code: ':bunko:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ztgsr96bn2i9akdm_bunko.gif' },
        { code: ':cigi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_iq5eafha9huz36h2_cigi.gif' },
        { code: ':coco:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_k3d85ztk0objzufp_coco.gif' },
        { code: ':elvis:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_m39l0qumdyj43jka_elvis.gif' },
        { code: ':felmosoly:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_td6vavyd8nv7tbqt_felmosoly.gif' },
        { code: ':fuck1:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_rtjzdpuv7ilyvc9c_fuck1.gif' },
        { code: ':fusillader:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fu077bi7qsxgiyl9_fusillader.gif' },
        { code: ':gondol:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_khe86mxoxirjery1_gondol.gif' },
        { code: ':grat:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_b6plf8oyffjjeomz_grat.gif' },
        { code: ':grinning:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_vbqtpqdq5dxgang5_grinning.gif' },
        { code: ':hehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fxhv6towsjxuacnw_hehe.gif' },
        { code: ':hehehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_i6ikyt0sdzjfcysz_hehehe.gif' },
        { code: ':hmm:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pma0dcwqso0oowhk_hmm.gif' },
        { code: ':huha:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_qpd2yhifajqpzrzg_huha.gif' },
        { code: ':idiota:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_dtauyqcahbvgtafk_idiota.gif' },
        { code: ':idiota2:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_htknjkdfz0pttnmf_idiota2.gif' },
        { code: ':idiota3:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_uupi128oj4q3vg1j_idiota3.gif' },
        { code: ':igen:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_m97zu6ylsflhdw5g_igen.gif' },
        { code: ':nem:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_occldijkfqjrfjce_nem.gif' },
        { code: ':ijedt:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_clram2elrcyhtogp_ijedt.gif' },
        { code: ':integet:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_x8naxemjfjtk5vvs_integet.gif' },
        { code: ':kacsint:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zci2vqvz44ogabsm_kacsint.gif' },
        { code: ':kocsog:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_v0mhygvcf47tipdb_kocsog.gif' },
        { code: ':lama:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_oknfqsidavmhgeuq_lama.gif' },
        { code: ':letsplay:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_esm9mjfstdpqnsjm_letsplay.gif' },
        { code: ':love:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_qpm3lyxagnngl5zt_love.gif' },
        { code: ':merges:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_dkfnuwxzvxns75ae_merges.gif' },
        { code: ':morcos:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_egyugzuyiex9nhvo_morcos.gif' },
        { code: ':nana:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l6h2tnobeeftpt8j_nana.gif' },
        { code: ':nice:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_o0d1srnco9em5exk_nice.gif' },
        { code: ':nyehehe:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_w7aqqj45p9nixmz3_nyehehe.gif' },
        { code: ':ohnej:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_gfemqrnojxsc6mkv_ohnej.gif' },
        { code: ':omg:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_isq9dlhjathmavsw_omg.gif' },
        { code: ':perky:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_vpkbnfhbxaridn7y_perky.gif' },
        { code: ':pias:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_bw7xdrk9ualzqiw0_pias.gif' },
        { code: ':pipazik:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pftlu8qnejpv2rwt_pipazik.gif' },
        { code: ':puszi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_pvktjqftgdr0axks_puszi.gif' },
        { code: ':ravasz:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_c0smadwax8yadphm_ravasz.gif' },
        { code: ':rohog:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_wczdpedmrnyr0klm_rohog.gif' },
        { code: ':sheriff:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xvjsp9rcfo01odvi_sheriff.gif' },
        { code: ':sleepy:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zbjijw303uitokmm_sleepy.gif' },
        { code: ':snotty:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_xpsckzywodnby7sm_snotty.gif' },
        { code: ':spooky:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_kd20nnb1mn6oev18_spooky.gif' },
        { code: ':surprised:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ikgcnrnqpgazruwx_surprised.gif' },
        { code: ':szaszmarci:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_l7vlmi0908giny1d_szaszmarci.gif' },
        { code: ':szomoru:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_eiryf0n6po4u3cn1_szomoru.gif' },
        { code: ':tough:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_zgpshspjbhuuysqu_tough.gif' },
        { code: ':uncsi:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_wwhv9yvhoutnquo3_uncsi.gif' },
        { code: ':vigyor:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_hlewdcmawdv1pujq_vigyor.gif' },
        { code: ':whoa:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_lvrygfdregmhx0tt_whoa.gif' },
        { code: ':wink:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_klqmlljupav0nmnh_wink.gif' },
        { code: ':yeah:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_as3g9letedztw9ii_yeah.gif' },
        { code: ':zombie:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_ua0towvr7th3y2oj_zombie.gif' },
        { code: ':poor:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_fgw3e840etthfeyi_poor.gif' },
        { code: ':alvas:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_s2x1btnj1zrzq1rz_alvas.gif' },
        { code: ':koccint:', src: 'https://cdn.rios.hu/dl/upc/2026-02/19/413301_lv15ria9cnmxtoty_koccint.gif' }
    ];

    function checkAndReplace(editor) {
        let html = editor.innerHTML;
        let changed = false;

        EXTRA_SMILIES.forEach(smiley => {
            if (html.includes(smiley.code)) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while(node = walk.nextNode()) {
                    if (node.textContent.includes(smiley.code)) {
                        const img = document.createElement('img');
                        img.src = smiley.src;
                        img.alt = smiley.code;
                        img.dataset.mceSrc = smiley.src;

                        // Kicseréljük a szöveges részt a képre
                        const parts = node.textContent.split(smiley.code);
                        const fragment = document.createDocumentFragment();

                        parts.forEach((part, i) => {
                            fragment.appendChild(document.createTextNode(part));
                            if (i < parts.length - 1) {
                                fragment.appendChild(img.cloneNode(true));
                            }
                        });

                        node.parentNode.replaceChild(fragment, node);
                        changed = true;
                    }
                }
                if (changed) html = tempDiv.innerHTML;
            }
        });

        if (changed) {
            editor.innerHTML = html;
            placeCaretAtEnd(editor);
        }
    }

    function placeCaretAtEnd(el) {
        el.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function attachEditorEvents() {
        const editor = document.querySelector('.mce-content-body[contenteditable="true"]');
        if (editor && !editor.dataset.smileyEventsAttached) {
            editor.addEventListener('keyup', (e) => {
                // Ha befejeztük a kódot (kettőspont) vagy szóközt nyomtunk
                if (e.key === ':' || e.key === ' ' || e.key === 'Enter') {
                    checkAndReplace(editor);
                }
            });
            editor.dataset.smileyEventsAttached = 'true';
        }
    }

    function createSmileyElement(smiley) {
        const link = document.createElement('a');
        link.href = 'javascript:;';
        link.style.margin = '2px';
        link.innerHTML = `<img src="${smiley.src}" alt="${smiley.code}" title="${smiley.code}" style="vertical-align: middle;">`;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const editor = document.querySelector('.mce-content-body[contenteditable="true"]');
            if (editor) {
                editor.focus();
                // Itt sima HTML-ként szúrjuk be, a PH szerkesztője tudni fogja
                const imgHTML = `<img src="${smiley.src}" alt="${smiley.code}" data-mce-src="${smiley.src}">`;
                document.execCommand('insertHTML', false, imgHTML);
            }
        });
        return link;
    }

    function enhanceSmileyContainer(container) {
        if (!container || container.dataset.phExtraSmiliesInjected) return;

        const extraRow = document.createElement('div');
        extraRow.style.cssText = 'display: block; width: 100%; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #aaa; clear: both;';

        const label = document.createElement('div');
        label.style.cssText = 'font-size: 10px; color: #888; margin-bottom: 4px;';
        extraRow.appendChild(label);

        EXTRA_SMILIES.forEach(smiley => {
            extraRow.appendChild(createSmileyElement(smiley));
        });

        container.appendChild(extraRow);
        container.dataset.phExtraSmiliesInjected = '1';
        attachEditorEvents();
    }

    const observer = new MutationObserver(() => {
        const target = document.querySelector('.rtif-smiles');
        if (target) enhanceSmileyContainer(target);
        attachEditorEvents();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(attachEditorEvents, 1000);
})();