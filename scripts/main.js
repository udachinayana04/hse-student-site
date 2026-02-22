"use strict";

window.onload = function () {
    bindDialogButton();
    initCampusMap();
    initVirtualChat();
};

function bindDialogButton() {
    const openButton = document.getElementById("openContactDialog");
    const dialog = document.getElementById("contactDialog");

    if (!openButton || !dialog || typeof dialog.showModal !== "function") {
        return;
    }

    openButton.addEventListener("click", function () {
        dialog.showModal();
    });
}

function initCampusMap() {
    const mapNode = document.getElementById("campusMap");

    if (!mapNode) {
        return;
    }

    if (typeof window.L === "undefined") {
        mapNode.textContent = "Не удалось загрузить карту. Проверьте подключение к интернету.";
        return;
    }

    const campusCoords = [55.8035, 37.4098];
    const map = window.L.map(mapNode).setView(campusCoords, 16);

    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    }).addTo(map);

    window.L.marker(campusCoords)
        .addTo(map)
        .bindPopup("МИЭМ ВШЭ, Москва, ул. Таллинская, 34")
        .openPopup();

    window.L.circle(campusCoords, {
        radius: 220,
        color: "#0056b3",
        fillColor: "#3b82f6",
        fillOpacity: 0.22
    }).addTo(map);
}

function initVirtualChat() {
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const messagesNode = document.getElementById("chatMessages");
    const voiceButton = document.getElementById("voiceButton");
    const voiceStatus = document.getElementById("voiceStatus");

    if (!form || !input || !messagesNode || !voiceButton || !voiceStatus) {
        return;
    }

    const baseReplies = [
        "Спасибо за сообщение! Я отвечу, как только освобожусь после пар.",
        "Отличный вопрос. На странице есть расписание, можешь свериться с ним.",
        "Принято! Если нужно, уточни детали и я дам более точный ответ.",
        "Супер, я записала это. Чем еще могу помочь?"
    ];

    const keywordRules = [
        {
            keywords: ["привет", "здравств", "hello"],
            replies: [
                "Привет! Рада видеть тебя на моей странице.",
                "Здравствуйте! Спрашивайте, я на связи."
            ]
        },
        {
            keywords: ["распис", "пара", "занят"],
            replies: [
                "Расписание находится в таблице ниже блока «Мои проекты».",
                "По расписанию у меня 12 пар в неделю. Смотри раздел «Мое расписание»."
            ]
        },
        {
            keywords: ["миэм", "вшэ", "факультет"],
            replies: [
                "Я учусь в МИЭМ ВШЭ на программе «Прикладная математика».",
                "МИЭМ для меня про математику, алгоритмы и много практики."
            ]
        },
        {
            keywords: ["проект", "дашборд", "рунге"],
            replies: [
                "Про проекты можно посмотреть в разделе «Мои проекты».",
                "Да, я работаю и с математическими моделями, и с аналитическими дашбордами."
            ]
        },
        {
            keywords: ["контакт", "почта", "telegram", "телеграм"],
            replies: [
                "Нажмите кнопку «Показать контакты (Dialog)», там есть все контакты.",
                "По связи удобнее Telegram, но почта тоже подходит."
            ]
        },
        {
            keywords: ["карта", "кампус", "таллин"],
            replies: [
                "Карту кампуса можно приближать и двигать мышкой.",
                "На карте отмечен кампус МИЭМ на Таллинской улице."
            ]
        }
    ];

    let mediaRecorder = null;
    let stream = null;
    let chunks = [];

    addTextMessage("Привет! Я виртуальный ассистент автора страницы. Напиши сообщение или отправь голос.", "bot");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const text = input.value.trim();

        if (!text) {
            return;
        }

        addTextMessage(text, "user");
        input.value = "";
        sendBotReply(text);
    });

    if (!isVoiceSupported()) {
        voiceButton.disabled = true;
        voiceStatus.textContent = "Запись голоса недоступна в этом браузере.";
        return;
    }

    voiceButton.addEventListener("click", function () {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopVoiceRecording();
        } else {
            startVoiceRecording();
        }
    });

    window.addEventListener("beforeunload", function () {
        stopStreamTracks();
    });

    function isVoiceSupported() {
        return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    }

    function addTextMessage(text, author) {
        const message = document.createElement("article");
        message.className = "chat-message " + author;
        message.textContent = text;
        message.appendChild(buildMeta(author === "user" ? "Вы" : "Бот"));
        messagesNode.appendChild(message);
        scrollToBottom();
    }

    function addVoiceMessage(audioUrl) {
        const message = document.createElement("article");
        message.className = "chat-message user";

        const title = document.createElement("div");
        title.textContent = "Голосовое сообщение";
        message.appendChild(title);

        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = audioUrl;
        message.appendChild(audio);

        message.appendChild(buildMeta("Вы"));
        messagesNode.appendChild(message);
        scrollToBottom();
    }

    function buildMeta(authorLabel) {
        const meta = document.createElement("small");
        const now = new Date();
        const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
        meta.className = "chat-meta";
        meta.textContent = authorLabel + " • " + time;
        return meta;
    }

    function scrollToBottom() {
        messagesNode.scrollTop = messagesNode.scrollHeight;
    }

    function getReply(text) {
        const lower = text.toLowerCase();
        let pool = [];

        keywordRules.forEach(function (rule) {
            const hasKeyword = rule.keywords.some(function (keyword) {
                return lower.includes(keyword);
            });

            if (hasKeyword) {
                pool = pool.concat(rule.replies);
            }
        });

        if (!pool.length) {
            pool = baseReplies;
        }

        return pool[Math.floor(Math.random() * pool.length)];
    }

    function sendBotReply(text) {
        const response = getReply(text);
        const delay = 600 + Math.floor(Math.random() * 900);

        window.setTimeout(function () {
            addTextMessage(response, "bot");
        }, delay);
    }

    async function startVoiceRecording() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunks = [];
            const recorderSetup = getRecorderSetup();
            mediaRecorder = recorderSetup.options
                ? new MediaRecorder(stream, recorderSetup.options)
                : new MediaRecorder(stream);

            mediaRecorder.addEventListener("dataavailable", function (event) {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            });

            mediaRecorder.addEventListener("error", function () {
                voiceStatus.textContent = "Ошибка записи. Попробуйте еще раз.";
                stopStreamTracks();
                mediaRecorder = null;
                voiceButton.textContent = "Голос";
            });

            mediaRecorder.addEventListener("stop", function () {
                if (!chunks.length) {
                    voiceStatus.textContent = "Запись не сохранилась. Попробуйте еще раз.";
                    stopStreamTracks();
                    mediaRecorder = null;
                    voiceButton.textContent = "Голос";
                    return;
                }

                const mimeType =
                    chunks[0].type ||
                    mediaRecorder.mimeType ||
                    recorderSetup.mimeType ||
                    "audio/mp4";
                const blob = new Blob(chunks, { type: mimeType });
                const audioUrl = URL.createObjectURL(blob);
                addVoiceMessage(audioUrl);
                voiceStatus.textContent = "Голосовое сообщение добавлено в чат.";
                sendBotReply("голосовое сообщение");
                stopStreamTracks();
                mediaRecorder = null;
                voiceButton.textContent = "Голос";
            });

            mediaRecorder.start();
            voiceStatus.textContent = "Идет запись... Нажмите «Стоп», чтобы завершить.";
            voiceButton.textContent = "Стоп";
        } catch (error) {
            voiceStatus.textContent = "Не удалось начать запись. Разрешите доступ к микрофону.";
        }
    }

    function stopVoiceRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    }

    function getRecorderSetup() {
        if (typeof window.MediaRecorder === "undefined" || typeof window.MediaRecorder.isTypeSupported !== "function") {
            return { options: null, mimeType: "" };
        }

        const preferredTypes = [
            "audio/mp4",
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus"
        ];

        for (let i = 0; i < preferredTypes.length; i += 1) {
            const type = preferredTypes[i];
            if (window.MediaRecorder.isTypeSupported(type)) {
                return {
                    options: { mimeType: type },
                    mimeType: type
                };
            }
        }

        return { options: null, mimeType: "" };
    }

    function stopStreamTracks() {
        if (!stream) {
            return;
        }

        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        stream = null;
    }
}
