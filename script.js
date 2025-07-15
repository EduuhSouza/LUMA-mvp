// ELEMENTOS
const messageInput = document.querySelector(".message-input");
const chatBody = document.querySelector(".chat-body");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const FileCalcelButton = document.querySelector("#file-calcel");
const micButton = document.querySelector("#mic-btn");

// FALA DO BOT
const synth = window.speechSynthesis;
let voicesLoaded = false;
let ptVoice = null;

const loadVoices = () => {
    return new Promise((resolve) => {
        let voices = synth.getVoices();

        const chooseVoice = () => {
            // Filtra apenas vozes em português
            const ptVoices = voices.filter(v => v.lang === "pt-BR" || v.lang.startsWith("pt"));

            // Tenta encontrar uma voz feminina conhecida
            ptVoice = ptVoices.find(v => 
                v.name.includes("Maria") ||
                v.name.includes("Google português do Brasil") ||
                v.name.toLowerCase().includes("feminina")
            ) || ptVoices[0]; // Se não encontrar, pega a primeira

            voicesLoaded = true;
            resolve();
        };

        if (voices.length !== 0) {
            chooseVoice();
        } else {
            synth.addEventListener("voiceschanged", () => {
                voices = synth.getVoices();
                chooseVoice();
            }, { once: true });
        }
    });
};

const speak = async (text) => {
    if (!'speechSynthesis' in window) return;

    await loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;

    if (ptVoice) utterance.voice = ptVoice;

    synth.cancel(); // Evita sobreposição
    synth.speak(utterance);
};

// HISTÓRICO COMPLETO DE CONVERSA
const chatHistory = [];

const API_KEY = "AIzaSyCiKAjpH-0jUOnX4xjpO7eEmlBN1HuqeOQ";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}

// Flag para saber se a mensagem veio do microfone
let fromMic = false;

const createMenssageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// RESPOSTA DO CHAT USANDO A API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    const parts = [{ text: userData.message }];
    if (userData.file.data) {
        parts.push({ inline_data: userData.file });
    }

    // Adiciona instrução do sistema apenas uma vez
    if (!chatHistory.some(msg => msg.role === "system")) {
        chatHistory.unshift({
            role: "user",
            parts: [{
                text: "A partir de agora, aja como Aluma, uma assistente especializada em tecnologia, manutenção de computadores, Fundação o Pão dos Pobres de Santo Antônio, e inovação tecnológica. Responda apenas perguntas relacionadas a esses temas e sobre o projeto ALUMA: A Aluma é uma ferramenta educacional inovadora criada para oferecer suporte prático e eficiente a professores e alunos. Seu diferencial está na entrega de respostas rápidas e objetivas, facilitando o acesso à informação e otimizando o tempo dos usuários. Além de modernizar as práticas pedagógicas por meio da tecnologia, ela estimula a autonomia e o interesse dos alunos, ao mesmo tempo em que apoia os professores no planejamento das aulas e na mediação do conhecimento. Criamos um terminal físico com um visual de fliperama que chama atenção e convida à interação, a equipe criadora do projeto é a Octopus, formada por Eduarda Souza: cuida da parte visual do projeto, Henrike Pajares: Programador back-end do projeto, Gabriel Mendes:Programador back-end do projeto e Leonardo Kubiaki: faz um pouco de tudo, assistente. Se a pergunta estiver fora desses tópicos, diga que só responde perguntas sobre tecnologia, manutenção de computadores, Fundação o Pão dos Pobres de Santo Antônio e inovação tecnológica, além de ajudar a planejar."
            }]
        });
    }

    // Adiciona a pergunta do usuário
    chatHistory.push({
        role: "user",
        parts: parts
    });

    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: chatHistory })
    };

    try {
        const response = await fetch(API_URL, requestOptions);
        const data = await response.json();
        if (!response.ok || !data.candidates || !data.candidates[0]) {
            throw new Error(data.error?.message || "Resposta inválida.");
        }

        // CORRIJE OS * SOLTOS
   const apiResponseText = data.candidates[0].content.parts[0].text
    // Formata títulos: adiciona espaço antes e depois, e remove os #
    .replace(/^#{1,6}\s*(.+)$/gm, "\n\n$1\n\n")
    // Remove **negrito**
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Remove *itálico*
    .replace(/\*(.*?)\*/g, "$1")
    // Remove __sublinhado__
    .replace(/__(.*?)__/g, "$1")
    // Remove _itálico_
    .replace(/_(.*?)_/g, "$1")
    // Remove ~~riscado~~
    .replace(/~~(.*?)~~/g, "$1")
    // Remove todos os * restantes
    .replace(/\*/g, "")
    .trim();

messageElement.innerText = apiResponseText;

// FORMATAÇÃO DOS TEXTOS
const markdownToHTML = (text) => {
    return text
        // Títulos (do h1 ao h6)
        .replace(/^######\s?(.*)$/gm, "<h6>$1</h6>")
        .replace(/^#####\s?(.*)$/gm, "<h5>$1</h5>")
        .replace(/^####\s?(.*)$/gm, "<h4>$1</h4>")
        .replace(/^###\s?(.*)$/gm, "<h3>$1</h3>")
        .replace(/^##\s?(.*)$/gm, "<h2>$1</h2>")
        .replace(/^#\s?(.*)$/gm, "<h1>$1</h1>")
        // Negrito **texto**
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Itálico *texto*
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Sublinhado __texto__
        .replace(/__(.*?)__/g, "<u>$1</u>")
        // Riscado ~~texto~~
        .replace(/~~(.*?)~~/g, "<del>$1</del>")
        // Listas - ou *
        .replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>")
        // Parágrafos
        .replace(/(?:\r\n|\r|\n){2,}/g, "</p><p>")
        .replace(/^((?!<h|<ul|<li|<p).+)$/gm, "<p>$1</p>");
};

const apiResponseRaw = data.candidates[0].content.parts[0].text;
const apiResponseHTML = markdownToHTML(apiResponseRaw);
messageElement.innerHTML = apiResponseHTML;


        // Salva resposta do bot
        chatHistory.push({
            role: "model",
            parts: [{ text: apiResponseText }]
        });

        if (fromMic && 'speechSynthesis' in window) {
            await speak(apiResponseText);
        }

    } catch (error) {
        console.error("Erro na API:", error);
        messageElement.innerText = "Erro ao obter resposta.";
        messageElement.style.color = 'red';
    } finally {
        userData.file = {};
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        fromMic = false;
    }
};


const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    if (!userData.message) return;

    messageInput.value = "";
    fileUploadWrapper.classList.remove("file-uploaded");

    const messageContent = `<div class="message-text"></div>
        ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;

    const outgoingMessageDiv = createMenssageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    setTimeout(() => {
        const botMessageContent = `<img class="bot-avatar" src="imgs/Avatar LUMA.jpg" alt="">
            <div class="message-text"> 
                <div class="thinking-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div> 
            </div>`;

        const incomingMessageDiv = createMenssageElement(botMessageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        generateBotResponse(incomingMessageDiv);
    }, 600);
}

// ENTER para enviar mensagem
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
        handleOutgoingMessage(e);
    }
});

// ARQUIVOS
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");

        const base64String = e.target.result.split(",")[1];
        userData.file = {
            data: base64String,
            mime_type: file.type
        }

        fileInput.value = "";
    }

    reader.readAsDataURL(file);
});

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
FileCalcelButton.addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("file-uploaded");
});

// MICROFONE: TRANSCRIÇÃO E ENVIO AO PARAR
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
let isRecording = false;

recognition.lang = "pt-BR";
recognition.interimResults = true;

let finalTranscript = "";

recognition.addEventListener("result", (event) => {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
        } else {
            interimTranscript += transcript;
        }
    }

    messageInput.value = (finalTranscript + interimTranscript).trim();
});

recognition.addEventListener("end", () => {
    micButton.classList.remove("recording");
    isRecording = false;

    // A transcrição termina, mas não envia a mensagem automaticamente.
    messageInput.value = finalTranscript.trim();
    finalTranscript = "";
    fromMic = true; // ainda permite resposta com voz se quiser
});

micButton.addEventListener("click", () => {
    if (isRecording) {
        recognition.stop(); // Para a gravação e finaliza
    } else {
        finalTranscript = "";
        recognition.start(); // Começa a gravar
        micButton.classList.add("recording");
        isRecording = true;
    }
});




// INTRO 

window.addEventListener("load", () => {
    const intro = document.getElementById("intro");
    const introText = document.getElementById("introText");
  
    // Texto depois do "Inicializando sistema..."
    setTimeout(() => {
      introText.innerText = "Olá, eu sou a ALUMA...";
      introText.style.animation = "none";
      void introText.offsetWidth; // reinicia animação
      introText.style.animation = "typing 3s steps(40, end) forwards, blink 0.8s step-end infinite";
    }, 4000);
  
    // Esconde a intro e revela o chat
    setTimeout(() => {
      intro.style.opacity = 0;
      setTimeout(() => {
        intro.style.display = "none";
      }, 1000);
    }, 8000);
  });
  
  
