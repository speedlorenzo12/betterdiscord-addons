/**
 * @name zDiscordQuestCompleter
 * @version 4.4.0
 * @description Completa automaticamente le quest di Discord. Versione 4.4 con notifiche garantite.
 * @author speedlorenzo12
 * @website https://gist.github.com/aamiaa/204cd9d42013ded9faf646fae7f89fbb
 */

module.exports = class DiscordQuestCompleter {
    constructor() {
        this.observer = null;
        this.buttonAdded = false;
        this.questInProgress = false;
        this.questStartTime = null;
        this.currentQuestName = null;
        this.questDuration = 120;
    }

    getName() { return "zDiscordQuestCompleter"; }
    getAuthor() { return "speedlorenzo12"; }
    getDescription() { return "Completa automaticamente le quest di Discord"; }
    getVersion() { return "4.4.0"; }

    start() {
        this.log("Plugin avviato! (v4.4 - notifiche garantite)");
        this.addCustomStyles();
        this.startObserver();
        this.tryAddButton();
    }

    stop() {
        this.log("Plugin fermato!");
        this.removeCustomStyles();
        this.stopObserver();
        this.removeButton();
    }

    log(message) {
        console.log(`[QuestCompleter] ${message}`);
    }

    showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = "quest-completer-toast";
        
        const colors = {
            success: "#43b581",
            error: "#f04747",
            info: "#5865F2",
            warning: "#faa61a"
        };
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            max-width: 400px;
            text-align: center;
            white-space: pre-line;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = "slideDown 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
        
        this.log(`[TOAST ${type}] ${message}`);
    }

    addCustomStyles() {
        const styleId = "quest-completer-styles";
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes slideDown {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
            }
            
            .quest-completer-button {
                padding: 10px 16px;
                background: linear-gradient(90deg, #5865F2 0%, #7289DA 100%);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 8px rgba(88, 101, 242, 0.25);
                white-space: nowrap;
                height: 40px;
                margin-left: 12px;
            }

            .quest-completer-button:hover {
                background: linear-gradient(90deg, #4752C4 0%, #5B6EAE 100%);
                box-shadow: 0 4px 12px rgba(88, 101, 242, 0.35);
                transform: translateY(-1px);
            }

            .quest-completer-button:active {
                transform: scale(0.98);
            }

            .quest-completer-button:disabled {
                background: #4E5058;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
                opacity: 0.6;
            }

            .quest-completer-icon {
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    removeCustomStyles() {
        const style = document.getElementById("quest-completer-styles");
        if (style) style.remove();
    }

    startObserver() {
        this.observer = new MutationObserver(() => {
            this.tryAddButton();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    isQuestPage() {
        const url = window.location.href;
        return url.includes('/quests') || url.includes('/quest');
    }

    findQuestContainer() {
        if (!this.isQuestPage()) {
            return null;
        }

        // PRIORITÀ 1: Cerca headingWrapper__57454 o varianti
        const headingWrappers = document.querySelectorAll('[class*="headingWrapper"]');
        for (const wrapper of headingWrappers) {
            const text = wrapper.textContent || '';
            // Verifica se contiene "Missioni disponibili" o "Quest" o "Available Quests"
            if (text.includes('Missioni disponibili') || 
                text.includes('Available Quests') ||
                text.includes('Quests disponibili') ||
                (text.toLowerCase().includes('quest') && text.toLowerCase().includes('availab'))) {
                
                this.log(`Trovato headingWrapper con testo: "${text.substring(0, 50)}..."`);
                this.log(`Classe: ${wrapper.className}`);
                return wrapper;
            }
        }

        // PRIORITÀ 2: Cerca qualsiasi headingWrapper nella pagina quest
        if (headingWrappers.length > 0) {
            this.log(`Trovati ${headingWrappers.length} headingWrapper, uso il primo`);
            return headingWrappers[0];
        }

        // PRIORITÀ 3: Cerca tramite testo "Missioni disponibili"
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent || '';
            const ownText = Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('');
            
            if (ownText.includes('Missioni disponibili') || ownText.includes('Available Quests')) {
                // Risali per trovare il wrapper
                let parent = el;
                let depth = 0;
                while (parent && depth < 3) {
                    const className = parent.className || '';
                    if (className.includes('heading') || className.includes('Wrapper')) {
                        this.log(`Trovato wrapper tramite testo, classe: ${className}`);
                        return parent;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
                this.log('Trovato elemento con testo "Missioni disponibili"');
                return el;
            }
        }

        // PRIORITÀ 4: Fallback - cerca elementi con classe heading
        const headingElements = document.querySelectorAll('[class*="heading"]');
        for (const heading of headingElements) {
            const parent = heading.closest('[class*="content"]') || heading.parentElement;
            if (parent) {
                const text = parent.textContent || '';
                if (text.toLowerCase().includes('quest') || text.toLowerCase().includes('missione')) {
                    this.log('Fallback: trovato elemento heading nel contesto quest');
                    return heading;
                }
            }
        }

        this.log('Nessun headingWrapper trovato');
        return null;
    }

    tryAddButton() {
        if (document.getElementById("quest-completer-btn")) return;

        const container = this.findQuestContainer();
        
        if (!container) {
            return;
        }

        this.log(`Contenitore trovato: ${container.className || container.tagName}`);
        this.addButton(container);
    }

    addButton(container) {
        // Crea il pulsante
        const button = document.createElement("button");
        button.id = "quest-completer-btn";
        button.className = "quest-completer-button";
        
        // Icona SVG
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("class", "quest-completer-icon");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "2");
        icon.innerHTML = `
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        `;
        
        const text = document.createElement("span");
        text.textContent = "Completa Quest";
        
        button.appendChild(icon);
        button.appendChild(text);
        
        button.addEventListener("click", () => this.handleButtonClick());
        
        // Strategia di inserimento intelligente per headingWrapper
        const className = container.className || '';
        
        if (className.includes('headingWrapper') || className.includes('heading')) {
            // Se è un headingWrapper, cerca dove inserire il pulsante
            
            // Opzione 1: Cerca uno stack o contenitore di azioni all'interno
            const actionContainer = container.querySelector('[class*="stack"]') ||
                                   container.querySelector('[class*="actions"]') ||
                                   container.querySelector('[class*="buttons"]');
            
            if (actionContainer) {
                actionContainer.appendChild(button);
                this.log('Pulsante aggiunto a contenitore azioni interno');
            } else {
                // Opzione 2: Cerca un div che contiene altri elementi (probabilmente un flex container)
                const flexContainers = Array.from(container.children).filter(child => {
                    const style = window.getComputedStyle(child);
                    return style.display === 'flex' || child.children.length > 0;
                });
                
                if (flexContainers.length > 0) {
                    // Aggiungi al primo contenitore flex (probabilmente contiene altri pulsanti/azioni)
                    flexContainers[0].appendChild(button);
                    this.log('Pulsante aggiunto a flex container');
                } else {
                    // Opzione 3: Crea un wrapper inline accanto al titolo
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; margin-left: 12px;';
                    wrapper.appendChild(button);
                    
                    // Trova il primo elemento di testo/titolo e aggiungilo accanto
                    const textElement = Array.from(container.childNodes).find(node => 
                        node.nodeType === Node.TEXT_NODE || 
                        (node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'SPAN'))
                    );
                    
                    if (textElement && textElement.nextSibling) {
                        container.insertBefore(wrapper, textElement.nextSibling);
                        this.log('Pulsante aggiunto accanto al titolo');
                    } else {
                        // Ultima opzione: aggiungi alla fine
                        container.appendChild(wrapper);
                        this.log('Pulsante aggiunto alla fine del headingWrapper');
                    }
                }
            }
        } else {
            // Se non è un headingWrapper, usa la strategia standard
            const buttonContainer = container.querySelector('[class*="stack"]') || 
                                   container.querySelector('div:has(> button)');
            
            if (buttonContainer) {
                buttonContainer.appendChild(button);
                this.log('Pulsante aggiunto a contenitore standard');
            } else {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;';
                wrapper.appendChild(button);
                container.appendChild(wrapper);
                this.log('Pulsante aggiunto in nuovo wrapper');
            }
        }
        
        this.buttonAdded = true;
        this.log("✅ Pulsante aggiunto con successo!");
    }

    removeButton() {
        const button = document.getElementById("quest-completer-btn");
        if (button) {
            const wrapper = button.parentElement;
            button.remove();
            // Rimuovi il wrapper solo se l'abbiamo creato noi e non contiene altro
            if (wrapper && wrapper.children.length === 0 && 
                !wrapper.className.includes('stack') && 
                !wrapper.className.includes('heading')) {
                wrapper.remove();
            }
            this.buttonAdded = false;
        }
    }

    async handleButtonClick() {
        const button = document.getElementById("quest-completer-btn");
        if (!button || this.questInProgress) return;

        this.showToast("🚀 Script avviato!", "success");
        button.disabled = true;
        const originalText = button.querySelector("span").textContent;
        button.querySelector("span").textContent = "Verifica...";

        try {
            await this.runQuestScript();
        } catch (error) {
            this.log("Errore durante l'esecuzione: " + error);
        } finally {
            if (button && !this.questInProgress) {
                button.disabled = false;
                button.querySelector("span").textContent = originalText;
            }
        }
    }

    updateButtonProgress() {
        const button = document.getElementById("quest-completer-btn");
        if (!button || !this.questInProgress || !this.questStartTime) return;

        const elapsed = Math.floor((Date.now() - this.questStartTime) / 1000);
        const remaining = Math.max(0, this.questDuration - elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        button.querySelector("span").textContent = `${this.currentQuestName || 'Quest'} - ${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            this.questInProgress = false;
            button.disabled = false;
            button.querySelector("span").textContent = "Completa Quest";
        } else {
            setTimeout(() => this.updateButtonProgress(), 1000);
        }
    }

    async runQuestScript() {
        try {
            const self = this;
            
            // PRIMA controlla sempre le quest localmente per mostrare le notifiche
            this.log("Controllo quest prima di eseguire lo script...");
            await this.checkAndNotifyQuests();
            
            const showToast = (message, type) => {
                self.showToast(message, type);
            };
            const setQuestProgress = (inProgress, questName = null, duration = 120) => {
                self.questInProgress = inProgress;
                self.currentQuestName = questName;
                self.questDuration = duration;
                if (inProgress) {
                    self.questStartTime = Date.now();
                    self.updateButtonProgress();
                } else {
                    self.questStartTime = null;
                }
            };
            
            let codeExecuted = false;
            
            // Tenta di scaricare il codice aggiornato
            try {
                const response = await fetch('https://speedlorenzo12.github.io/betterdiscord-addons/test/quest%20completer.js', {
                    cache: 'no-cache'
                });
                
                if (response.ok) {
                    const remoteCode = await response.text();
                    self.log("Codice scaricato: " + remoteCode.length + " caratteri");
                    
                    if (remoteCode.trim().length > 100 && !remoteCode.includes('404') && !remoteCode.includes('Not Found')) {
                        try {
                            const executeRemoteCode = new Function('showToast', 'setQuestProgress', remoteCode);
                            await executeRemoteCode(showToast, setQuestProgress);
                            codeExecuted = true;
                            self.log("Codice remoto eseguito con successo");
                            return;
                        } catch (execError) {
                            self.log("Errore esecuzione codice remoto: " + execError);
                        }
                    } else {
                        self.log("Codice remoto non valido o troppo corto");
                    }
                } else {
                    self.log("Fetch fallito con status: " + response.status);
                }
            } catch (fetchError) {
                self.log("Errore download codice: " + fetchError);
            }
            
            // Se il codice remoto non funziona, mostra messaggio
            if (!codeExecuted) {
                self.log("Codice remoto non disponibile");
            }
            
        } catch (error) {
            self.log("Errore critico: " + error);
            self.log("Stack trace: " + error.stack);
        }
    }
    
    async checkAndNotifyQuests() {
        try {
            this.log("Inizio controllo quest per notifiche");
            
            // Ottieni il token
            let token = null;
            try {
                token = (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken();
            } catch (e) {
                this.log("Errore ottenimento token webpack: " + e);
            }
            
            if (!token) {
                try {
                    const iframe = document.body.appendChild(document.createElement('iframe'));
                    const localToken = iframe.contentWindow.localStorage.token;
                    document.body.removeChild(iframe);
                    token = localToken ? localToken.replace(/"/g, '') : null;
                } catch (e) {
                    this.log("Errore ottenimento token localStorage: " + e);
                }
            }
          
            
            const response = await fetch('https://discord.com/api/v9/quests', {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                this.log("API /quests ha restituito status: " + response.status);
                return;
            }
            
            const data = await response.json();
            this.log("Risposta API ricevuta");
            
            if (!data || !data.quests) {
                this.log("Risposta API non contiene quests");
                return;
            }
            
            const allQuests = data.quests;
            this.log("Totale quest dall'API: " + allQuests.length);
            
            const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
            
            const activeQuests = allQuests.filter(quest => {
                const userStatus = quest.user_status;
                const config = quest.config;
                
                if (!userStatus || !config) return false;
                
                const enrolled = userStatus.enrolled_at;
                const completed = userStatus.completed_at;
                const expired = new Date(config.expires_at).getTime() <= Date.now();
                const taskConfig = config.task_config || config.task_config_v2;
                
                if (!taskConfig || !taskConfig.tasks) return false;
                
                const hasSupportedTask = supportedTasks.some(task => taskConfig.tasks[task]);
                
                return enrolled && !completed && !expired && hasSupportedTask;
            });
            
            this.log(`Quest filtrate: ${activeQuests.length} completabili su ${allQuests.length} totali`);
            
            if (activeQuests.length === 0) {
                this.log("Nessuna quest completabile trovata");
            } else {
                const questNames = activeQuests.map(q => {
                    const name = q.config?.messages?.quest_name || 'Quest senza nome';
                    return name.length > 30 ? name.substring(0, 30) + '...' : name;
                });
                
                if (questNames.length === 1) {
                    this.log(`Quest attiva trovata: ${questNames[0]}`);
                } else {
                    this.log(`${questNames.length} quest attive trovate`);
                }
            }
            
        } catch (error) {
            this.log("Errore nel controllo quest: " + error);
        }
    }
};
