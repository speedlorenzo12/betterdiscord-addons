/**
 * @name zcustom discord plugin settings
 * @author speedlorenzo12 (migliorato da Claude) (it's a garbage ik)
 * @description Permette di nascondere o riordinare le sezioni nelle impostazioni di Discord tramite un'interfaccia di configurazione a griglia.
 * @version 2.1.0
 */

const config = {
    info: {
        name: "zcustom discord plugin settings 2",
        authors: [
            {
                name: "speedlorenzo12",
                discord_id: "",
                github_username: ""
            }
        ],
        version: "2.1.0",
        description: "Permette di nascondere o riordinare le sezioni nelle impostazioni di Discord tramite un'interfaccia di configurazione a griglia.",
        github: "",
        github_raw: ""
    }
};

class CustomDiscordSettings {
    constructor() {
        this.originalStyles = new Map();
        this.interval = null;
        this.defaultSettings = {
            enabled: true,
            autoRefresh: true,
            sectionsToHide: "Potenziamento server,Nitro,Offerta,Payment Flow Modals,Payment Components,Revenue Storybook,Profile Effects Preview Tool,Intl Testing,Web Setting Tree Tool,Name Plates Tool,Virtual Currency Config,Nameplates Preview Tool,Design Systems,PFX Editor",
            priorityGroups: [
                {
                    name: "In cima",
                    sections: "BetterDiscord,Impostazioni,Aggiornamenti,CSS Personalizzato,Plugins,Temi"
                },
                {
                    name: "Priorità Media",
                    sections: "OpenAsar"
                },
                {
                    name: "Priorità Bassa",
                    sections: "Developer Only,Experiments,Developer Options,Hotspot Options,Dismissible Contents,Text Playground,Text Components"
                },
                {
                    name: "Priorità Molto Bassa",
                    sections: "Speed Test"
                }
            ],
            customSeparators: true,
            separatorColor: "#5865F2"
        };
        this.settings = {...this.defaultSettings};
        this.isDarkMode = true; // Assumiamo dark mode di default
    }

    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
    getDescription() { return config.info.description; }
    getVersion() { return config.info.version; }

    // Funzione di caricamento del plugin
    start() {
        // Verifica se BetterDiscord è disponibile
        if (!global.BdApi) {
            console.error("BdApi non disponibile!");
            return;
        }

        // Carica le impostazioni salvate
        this.loadSettings();
        
        // Determina se siamo in dark mode
        this.checkTheme();
        
        // Applica le modifiche solo se il plugin è abilitato
        if (this.settings.enabled) {
            this.applyChanges();
            this.startCyclicCheck();
        }
    }

    // Controlla il tema attuale
    checkTheme() {
        const body = document.body;
        this.isDarkMode = body.classList.contains("theme-dark") || 
                          !body.classList.contains("theme-light");
    }

    // Funzione per caricare le impostazioni salvate
    loadSettings() {
        const savedSettings = BdApi.Data.load(this.getName(), "settings");
        if (savedSettings) {
            // Gestisci la retrocompatibilità
            if (!savedSettings.priorityGroups && 
                savedSettings.priority1 !== undefined) {
                // Converti dal vecchio formato
                const priorityGroups = [];
                
                if (savedSettings.priority1) {
                    priorityGroups.push({
                        name: "In cima",
                        sections: savedSettings.priority1
                    });
                }
                
                if (savedSettings.priority2) {
                    priorityGroups.push({
                        name: "Priorità Media",
                        sections: savedSettings.priority2
                    });
                }
                
                if (savedSettings.priority3) {
                    priorityGroups.push({
                        name: "Priorità Bassa",
                        sections: savedSettings.priority3
                    });
                }
                
                if (savedSettings.priority4) {
                    priorityGroups.push({
                        name: "Priorità Molto Bassa",
                        sections: savedSettings.priority4
                    });
                }
                
                // Aggiorna le impostazioni con il nuovo formato
                savedSettings.priorityGroups = priorityGroups;
                
                // Rimuovi le vecchie chiavi
                delete savedSettings.priority1;
                delete savedSettings.priority2;
                delete savedSettings.priority3;
                delete savedSettings.priority4;
            }
            
            this.settings = {...this.defaultSettings, ...savedSettings};
        }
    }

    // Funzione per salvare le impostazioni
    saveSettings() {
        BdApi.Data.save(this.getName(), "settings", this.settings);
    }

    // Funzione per applicare le modifiche alle sezioni
    applyChanges() {
        const settingsElements = document.querySelectorAll('[aria-label="Impostazioni utente"] >*');
        
        // Converti le stringhe di configurazione in array
        const namestoHide = this.settings.sectionsToHide.split(',').map(item => item.trim()).filter(item => item !== "");
        
        // Nascondi le sezioni specificate
        settingsElements.forEach(el => {
            const textContent = el.textContent.trim();
            if (namestoHide.includes(textContent)) {
                this.saveOriginalStyle(el, 'display');
                el.style.display = 'none';
            }
        });
        
        // Applica ordini di priorità
        this.settings.priorityGroups.forEach((group, index) => {
            const priority = -(this.settings.priorityGroups.length - index);
            const sections = group.sections.split(',').map(item => item.trim()).filter(item => item !== "");
            
            settingsElements.forEach(el => {
                const textContent = el.textContent.trim();
                if (sections.includes(textContent)) {
                    this.saveOriginalStyle(el, 'order');
                    el.style.order = priority;
                }
            });
        });

        // Applica stili ai separatori se abilitati
        if (this.settings.customSeparators && this.settings.priorityGroups.length > 0) {
            const separatorColor = this.settings.separatorColor || "#5865F2";
            
            // Trova i selettori per i separatori
            const separators = document.querySelectorAll('[aria-label="Impostazioni utente"] > [class*=separator]');
            
            // Distribuisci i separatori tra i gruppi di priorità
            if (separators.length > 0) {
                separators.forEach((separator, idx) => {
                    if (idx < this.settings.priorityGroups.length - 1) {
                        const priority = -(this.settings.priorityGroups.length - idx - 0.5);
                        this.saveOriginalStyle(separator, 'order');
                        separator.style.order = priority;
                        
                        this.saveOriginalStyle(separator, 'backgroundColor');
                        separator.style.backgroundColor = separatorColor;
                    }
                });
            }
        }
    }

    // Funzione per salvare lo stile originale di un elemento
    saveOriginalStyle(el, prop) {
        if (!this.originalStyles.has(el)) {
            this.originalStyles.set(el, {});
        }
        this.originalStyles.get(el)[prop] = el.style[prop];
    }

    // Funzione per avviare il controllo ciclico delle impostazioni
    startCyclicCheck() {
        this.interval = setInterval(() => {
            const settingsPanel = document.querySelector('[aria-label="Impostazioni utente"]');
            if (settingsPanel && settingsPanel.style.display !== 'none') {
                // Ricontrolla il tema in caso sia cambiato
                this.checkTheme();
                this.applyChanges();
            }
        }, 700); // Controlla ogni 700 millisecondi
    }

    // Funzione per fermare il plugin
    stop() {
        // Ripristina gli stili originali immediatamente
        this.restoreOriginalStyles();

        // Pulisci l'array degli stili originali
        this.originalStyles.clear();

        // Cancella l'intervallo di controllo ciclico
        clearInterval(this.interval);
    }

    // Funzione per ripristinare gli stili originali
    restoreOriginalStyles() {
        this.originalStyles.forEach((styles, el) => {
            Object.entries(styles).forEach(([prop, value]) => {
                el.style[prop] = value;
            });
        });

        // Rimuovi le modifiche visive immediatamente
        const settingsElements = document.querySelectorAll('[aria-label="Impostazioni utente"] >*');
        settingsElements.forEach(el => {
            el.style.display = '';
            el.style.order = '';
            el.style.backgroundColor = '';
        });
    }

    // Funzione per aggiornare le impostazioni
    updateSettings(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        // Riapplica le modifiche se il plugin è abilitato e l'aggiornamento automatico è attivo
        if (this.settings.enabled && this.settings.autoRefresh) {
            this.stop();
            this.applyChanges();
            this.startCyclicCheck();
        }
    }

    // Funzione per aggiornare un gruppo di priorità
    updatePriorityGroup(index, key, value) {
        if (this.settings.priorityGroups[index]) {
            this.settings.priorityGroups[index][key] = value;
            this.saveSettings();
            
            // Riapplica le modifiche se il plugin è abilitato e l'aggiornamento automatico è attivo
            if (this.settings.enabled && this.settings.autoRefresh) {
                this.stop();
                this.applyChanges();
                this.startCyclicCheck();
            }
        }
    }

    // Funzione per creare un pannello di impostazioni
    getSettingsPanel() {
        // Crea un contenitore per il pannello delle impostazioni
        const settingsPanel = document.createElement("div");
        settingsPanel.className = "bd-settings-panel";
        settingsPanel.style.padding = "10px";
        
        // Applica stili compatibili con dark mode
        const isDark = this.isDarkMode;
        const styles = {
            bg: isDark ? "#36393f" : "#ffffff",
            bgAlt: isDark ? "#2f3136" : "#f2f3f5",
            text: isDark ? "#dcddde" : "#2e3338",
            textMuted: isDark ? "#72767d" : "#747f8d",
            border: isDark ? "#202225" : "#e3e5e8",
            accent: "#5865F2",
            danger: "#f04747"
        };

        // Stili CSS globali per il pannello
        const styleElement = document.createElement("style");
        styleElement.textContent = `
            .zcd-settings-panel {
                color: ${styles.text};
                background-color: ${styles.bg};
                font-family: Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }
            
            .zcd-header {
                margin: 15px 0 5px;
                color: ${styles.text};
                font-weight: 600;
            }
            
            .zcd-setting-item {
                margin-bottom: 15px;
                padding: 10px;
                background-color: ${styles.bgAlt};
                border-radius: 5px;
            }
            
            .zcd-setting-name {
                font-weight: 500;
                color: ${styles.text};
                margin-bottom: 5px;
            }
            
            .zcd-setting-note {
                font-size: 0.8rem;
                color: ${styles.textMuted};
                margin-bottom: 8px;
            }
            
            .zcd-textbox {
                width: 100%;
                padding: 8px;
                margin-top: 5px;
                border-radius: 3px;
                border: 1px solid ${styles.border};
                background-color: ${isDark ? "#40444b" : "#ffffff"};
                color: ${styles.text};
                resize: vertical;
            }
            
            .zcd-button {
                padding: 8px 16px;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                color: white;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            
            .zcd-button-primary {
                background-color: ${styles.accent};
            }
            
            .zcd-button-primary:hover {
                background-color: #4752c4;
            }
            
            .zcd-button-danger {
                background-color: ${styles.danger};
            }
            
            .zcd-button-danger:hover {
                background-color: #d84040;
            }
            
            .zcd-button-secondary {
                background-color: ${isDark ? "#4f545c" : "#e3e5e8"};
                color: ${isDark ? "#ffffff" : "#4f545c"};
            }
            
            .zcd-button-secondary:hover {
                background-color: ${isDark ? "#5d6269" : "#d1d3d8"};
            }
            
            .zcd-drag-handle {
                cursor: grab;
                padding: 5px;
                margin-right: 5px;
                color: ${styles.textMuted};
            }
            
            .zcd-priority-group {
                border: 1px solid ${styles.border};
                border-radius: 5px;
                padding: 10px;
                margin-bottom: 10px;
                background-color: ${styles.bgAlt};
            }
            
            .zcd-priority-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .zcd-group-buttons {
                display: flex;
                gap: 5px;
            }
            
            .zcd-color-picker {
                width: 40px;
                height: 25px;
                padding: 0;
                border: 1px solid ${styles.border};
                border-radius: 3px;
                cursor: pointer;
                background-color: transparent;
            }
            
            .zcd-info-container {
                margin-top: 20px;
                padding: 10px;
                background-color: ${isDark ? "#202225" : "#f8f9f9"};
                border-radius: 5px;
                font-size: 0.8rem;
                color: ${styles.textMuted};
            }
            
            .zcd-switch {
                position: relative;
                display: inline-block;
                width: 42px;
                height: 24px;
            }
            
            .zcd-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .zcd-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: ${isDark ? "#72767d" : "#c7ccd1"};
                transition: .4s;
                border-radius: 24px;
            }
            
            .zcd-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .zcd-slider {
                background-color: ${styles.accent};
            }
            
            input:checked + .zcd-slider:before {
                transform: translateX(18px);
            }
        `;
        
        settingsPanel.appendChild(styleElement);
        settingsPanel.classList.add("zcd-settings-panel");

        // Funzione per creare un'intestazione
        const createHeader = (text, level = 2) => {
            const header = document.createElement(`h${level}`);
            header.textContent = text;
            header.className = "zcd-header";
            return header;
        };

        // Funzione per creare un interruttore (switch)
        const createSwitch = (id, name, note, checked, onChange) => {
            const container = document.createElement("div");
            container.className = "zcd-setting-item";
            
            const nameLabel = document.createElement("div");
            nameLabel.className = "zcd-setting-name";
            nameLabel.textContent = name;
            
            const noteLabel = document.createElement("div");
            noteLabel.className = "zcd-setting-note";
            noteLabel.textContent = note;
            
            const switchContainer = document.createElement("div");
            switchContainer.style.display = "flex";
            switchContainer.style.alignItems = "center";
            
            const switchLabel = document.createElement("label");
            switchLabel.className = "zcd-switch";
            
            const switchInput = document.createElement("input");
            switchInput.type = "checkbox";
            switchInput.id = id;
            switchInput.checked = checked;
            switchInput.addEventListener("change", (e) => {
                onChange(e.target.checked);
            });
            
            const sliderSpan = document.createElement("span");
            sliderSpan.className = "zcd-slider";
            
            switchLabel.appendChild(switchInput);
            switchLabel.appendChild(sliderSpan);
            
            switchContainer.appendChild(switchLabel);
            
            container.appendChild(nameLabel);
            container.appendChild(noteLabel);
            container.appendChild(switchContainer);
            
            return container;
        };

        // Funzione per creare un campo di testo
        const createTextbox = (id, name, note, value, onChange) => {
            const container = document.createElement("div");
            container.className = "zcd-setting-item";
            
            const nameLabel = document.createElement("div");
            nameLabel.className = "zcd-setting-name";
            nameLabel.textContent = name;
            
            const noteLabel = document.createElement("div");
            noteLabel.className = "zcd-setting-note";
            noteLabel.textContent = note;
            
            const textbox = document.createElement("textarea");
            textbox.id = id;
            textbox.value = value;
            textbox.className = "zcd-textbox";
            textbox.rows = 3;
            textbox.addEventListener("change", (e) => {
                onChange(e.target.value);
            });
            
            container.appendChild(nameLabel);
            container.appendChild(noteLabel);
            container.appendChild(textbox);
            
            return container;
        };

        // Funzione per creare un selettore di colore
        const createColorPicker = (id, name, note, value, onChange) => {
            const container = document.createElement("div");
            container.className = "zcd-setting-item";
            
            const nameLabel = document.createElement("div");
            nameLabel.className = "zcd-setting-name";
            nameLabel.textContent = name;
            
            const noteLabel = document.createElement("div");
            noteLabel.className = "zcd-setting-note";
            noteLabel.textContent = note;
            
            const colorPicker = document.createElement("input");
            colorPicker.type = "color";
            colorPicker.id = id;
            colorPicker.value = value;
            colorPicker.className = "zcd-color-picker";
            colorPicker.addEventListener("change", (e) => {
                onChange(e.target.value);
            });
            
            container.appendChild(nameLabel);
            container.appendChild(noteLabel);
            container.appendChild(colorPicker);
            
            return container;
        };

        // Funzione per creare un pulsante
        const createButton = (text, type, onClick) => {
            const button = document.createElement("button");
            button.textContent = text;
            button.className = `zcd-button zcd-button-${type}`;
            button.addEventListener("click", onClick);
            return button;
        };

        // Aggiungi intestazione principale
        settingsPanel.appendChild(createHeader("Impostazioni di zcustom discord plugin", 1));

        // Sezione Impostazioni Generali
        settingsPanel.appendChild(createHeader("Impostazioni Generali"));
        
        // Opzione Abilitato
        settingsPanel.appendChild(createSwitch(
            "enabled",
            "Abilitato",
            "Abilita o disabilita il plugin",
            this.settings.enabled,
            (value) => {
                this.updateSettings("enabled", value);
                if (value) {
                    this.applyChanges();
                    this.startCyclicCheck();
                } else {
                    this.stop();
                }
            }
        ));
        
        // Opzione Aggiornamento Automatico
        settingsPanel.appendChild(createSwitch(
            "autoRefresh",
            "Aggiornamento Automatico",
            "Aggiorna automaticamente le impostazioni quando vengono modificate",
            this.settings.autoRefresh,
            (value) => this.updateSettings("autoRefresh", value)
        ));

        // Sezione Sezioni da Nascondere
        settingsPanel.appendChild(createHeader("Sezioni da Nascondere"));
        
        // Campo per le sezioni da nascondere
        settingsPanel.appendChild(createTextbox(
            "sectionsToHide",
            "Sezioni da nascondere",
            "Inserisci i nomi delle sezioni da nascondere, separati da virgole",
            this.settings.sectionsToHide,
            (value) => this.updateSettings("sectionsToHide", value)
        ));

        // Sezione Gruppi di Priorità
        const priorityGroupsSection = document.createElement("div");
        priorityGroupsSection.appendChild(createHeader("Gruppi di Priorità"));
        
        // Container per i gruppi di priorità
        const priorityGroupsContainer = document.createElement("div");
        priorityGroupsContainer.id = "zcd-priority-groups";
        
        // Funzione per creare un gruppo di priorità
        const createPriorityGroup = (group, index) => {
            const groupContainer = document.createElement("div");
            groupContainer.className = "zcd-priority-group";
            groupContainer.dataset.index = index;
            
            // Header del gruppo con nome e pulsanti
            const groupHeader = document.createElement("div");
            groupHeader.className = "zcd-priority-header";
            
            // Handle per drag and drop (non funzionale qui ma visualmente presente)
            const dragHandle = document.createElement("div");
            dragHandle.className = "zcd-drag-handle";
            dragHandle.innerHTML = "&#8942;&#8942;"; // Icona "grip"
            dragHandle.title = "Trascina per riordinare";
            
            // Campo per il nome del gruppo
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.value = group.name;
            nameInput.placeholder = "Nome del gruppo";
            nameInput.style.flex = "1";
            nameInput.style.padding = "5px";
            nameInput.style.marginRight = "10px";
            nameInput.style.borderRadius = "3px";
            nameInput.style.border = `1px solid ${styles.border}`;
            nameInput.style.backgroundColor = isDark ? "#40444b" : "#ffffff";
            nameInput.style.color = styles.text;
            nameInput.addEventListener("change", (e) => {
                this.updatePriorityGroup(index, "name", e.target.value);
            });
            
            // Pulsanti per manipolare il gruppo
            const groupButtons = document.createElement("div");
            groupButtons.className = "zcd-group-buttons";
            
            // Pulsante per spostare su
            const moveUpButton = createButton("↑", "secondary", () => {
                if (index > 0) {
                    const temp = this.settings.priorityGroups[index];
                    this.settings.priorityGroups[index] = this.settings.priorityGroups[index - 1];
                    this.settings.priorityGroups[index - 1] = temp;
                    this.saveSettings();
                    
                    // Aggiorna UI
                    refreshPriorityGroups();
                    
                    // Riapplica le modifiche se necessario
                    if (this.settings.enabled && this.settings.autoRefresh) {
                        this.stop();
                        this.applyChanges();
                        this.startCyclicCheck();
                    }
                }
            });
            moveUpButton.style.padding = "3px 8px";
            
            // Pulsante per spostare giù
            const moveDownButton = createButton("↓", "secondary", () => {
                if (index < this.settings.priorityGroups.length - 1) {
                    const temp = this.settings.priorityGroups[index];
                    this.settings.priorityGroups[index] = this.settings.priorityGroups[index + 1];
                    this.settings.priorityGroups[index + 1] = temp;
                    this.saveSettings();
                    
                    // Aggiorna UI
                    refreshPriorityGroups();
                    
                    // Riapplica le modifiche se necessario
                    if (this.settings.enabled && this.settings.autoRefresh) {
                        this.stop();
                        this.applyChanges();
                        this.startCyclicCheck();
                    }
                }
            });
            moveDownButton.style.padding = "3px 8px";
            
            // Pulsante per eliminare
            const deleteButton = createButton("×", "danger", () => {
                this.settings.priorityGroups.splice(index, 1);
                this.saveSettings();
                
                // Aggiorna UI
                refreshPriorityGroups();
                
                // Riapplica le modifiche se necessario
                if (this.settings.enabled && this.settings.autoRefresh) {
                    this.stop();
                    this.applyChanges();
                    this.startCyclicCheck();
                }
            });
            deleteButton.style.padding = "3px 8px";
            
            groupButtons.appendChild(moveUpButton);
            groupButtons.appendChild(moveDownButton);
            groupButtons.appendChild(deleteButton);
            
            groupHeader.appendChild(dragHandle);
            groupHeader.appendChild(nameInput);
            groupHeader.appendChild(groupButtons);
            
            // Campo per le sezioni del gruppo
            const sectionsTextbox = document.createElement("textarea");
            sectionsTextbox.value = group.sections;
            sectionsTextbox.placeholder = "Inserisci i nomi delle sezioni, separati da virgole";
            sectionsTextbox.className = "zcd-textbox";
            sectionsTextbox.rows = 3;
            sectionsTextbox.addEventListener("change", (e) => {
                this.updatePriorityGroup(index, "sections", e.target.value);
            });
            
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(sectionsTextbox);
            
            return groupContainer;
        };
        
        // Funzione per aggiornare la visualizzazione dei gruppi di priorità
        const refreshPriorityGroups = () => {
            priorityGroupsContainer.innerHTML = "";
            
            this.settings.priorityGroups.forEach((group, index) => {
                priorityGroupsContainer.appendChild(createPriorityGroup(group, index));
            });
        };
        
        // Inizializza la visualizzazione dei gruppi
        refreshPriorityGroups();
        
        // Pulsante per aggiungere un nuovo gruppo
        const addGroupButton = createButton("Aggiungi Gruppo", "primary", () => {
            this.settings.priorityGroups.push({
                name: `Gruppo ${this.settings.priorityGroups.length + 1}`,
                sections: ""
            });
            this.saveSettings();
            
            // Aggiorna UI
            refreshPriorityGroups();
        });
        
        priorityGroupsSection.appendChild(priorityGroupsContainer);
        priorityGroupsSection.appendChild(document.createElement("br"));
        priorityGroupsSection.appendChild(addGroupButton);
        
        settingsPanel.appendChild(priorityGroupsSection);

        // Sezione Separatori
        settingsPanel.appendChild(createHeader("Separatori"));
        
        // Opzione Separatori Personalizzati
        settingsPanel.appendChild(createSwitch(
            "customSeparators",
            "Separatori personalizzati",
            "Abilita separatori personalizzati tra gruppi di priorità",
            this.settings.customSeparators,
            (value) => this.updateSettings("customSeparators", value)
        ));
        
        // Opzione Colore Separatore
        settingsPanel.appendChild(createColorPicker(
            "separatorColor",
            "Colore separatore",
            "Scegli il colore per i separatori personalizzati",
            this.settings.separatorColor,
            (value) => this.updateSettings("separatorColor", value)
        ));

        // Pulsanti di controllo
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.marginTop = "20px";
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.gap = "10px";
        
        // Pulsante Applica
        const applyButton = createButton("Applica", "primary", () => {
            this.stop();
            
            if (this.settings.enabled) {
                this.applyChanges();
                this.startCyclicCheck();
            }
            
            BdApi.showToast("Impostazioni applicate!", {type: "success"});
        });
        
        // Pulsante Ripristina Default
        const resetButton = createButton("Ripristina Default", "danger", () => {
			                // Ripristina le impostazioni predefinite
                this.settings = {...this.defaultSettings};
                this.saveSettings();
                
                // Aggiorna l'interfaccia
                this.stop();
                refreshPriorityGroups();
                
                if (this.settings.enabled) {
                    this.applyChanges();
                    this.startCyclicCheck();
                }
                
                BdApi.showToast("Impostazioni predefinite ripristinate!", {type: "info"});
            });
            
            buttonsContainer.appendChild(applyButton);
            buttonsContainer.appendChild(resetButton);
            settingsPanel.appendChild(buttonsContainer);

            // Aggiungi alcune informazioni sul plugin
            const infoContainer = document.createElement("div");
            infoContainer.className = "zcd-info-container";
            
            const infoText = document.createElement("div");
            infoText.innerHTML = `<b>${this.getName()}</b> v${this.getVersion()}<br>Autore: ${this.getAuthor()}<br><br>${this.getDescription()}<br><br>
            <b>Guida rapida:</b><br>
            1. Aggiungi gruppi di priorità per organizzare le sezioni<br>
            2. Usa i pulsanti ↑/↓ per modificare l'ordine dei gruppi<br>
            3. I gruppi in cima alla lista avranno la massima priorità<br>
            4. Clicca "Applica" per salvare e applicare le modifiche`;
            
            infoContainer.appendChild(infoText);
            settingsPanel.appendChild(infoContainer);

            return settingsPanel;
        }
        
        // Salva il contenuto delle sezioni in un array
        getSectionNames() {
            const sections = [];
            const settingsElements = document.querySelectorAll('[aria-label="Impostazioni utente"] >*');
            
            settingsElements.forEach(el => {
                const textContent = el.textContent.trim();
                if (textContent && !el.classList.contains('separator')) {
                    sections.push(textContent);
                }
            });
            
            return sections;
        }
    }

    module.exports = CustomDiscordSettings;
