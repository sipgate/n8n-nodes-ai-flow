# sipgate AI Flow Trigger Node

Ein n8n Webhook Trigger Node für sipgate AI Flow Voice Assistant Platform mit **automatischem Event-Routing über mehrere Outputs**.

## Übersicht

Dieser Node empfängt Webhook-Events von sipgate AI Flow und routet sie automatisch zu verschiedenen Ausgängen basierend auf dem Event-Typ. Dadurch kannst du verschiedene Workflows für verschiedene Events erstellen, ohne IF-Nodes verwenden zu müssen.

## 🎯 Features

### ✨ Mehrere Outputs für verschiedene Event-Typen

Der Node hat **6 dedizierte Outputs**, einen für jeden Event-Typ:

```
AI Flow Trigger Node
├─ Output 1: Session Start
├─ Output 2: User Speak
├─ Output 3: Assistant Speak
├─ Output 4: Assistant Speech Ended
├─ Output 5: User Input Timeout
└─ Output 6: Session End
```

**Vorteile:**
- ✅ Keine IF-Nodes oder Switch-Nodes für Event-Routing notwendig
- ✅ Saubere, übersichtliche Workflows
- ✅ Jeder Event-Typ kann seinen eigenen Verarbeitungspfad haben
- ✅ Events werden automatisch zum richtigen Output geroutet

## Unterstützte Events

### 1. **Session Start** (Output 1)
- Wird ausgelöst, wenn ein neuer Anruf beginnt
- Enthält Session-Informationen (ID, Telefonnummern, Richtung)
- Ideal für Begrüßungsnachrichten oder Initialisierung

### 2. **User Speak** (Output 2)
- Wird ausgelöst, wenn der Benutzer spricht (nach Speech-to-Text)
- Enthält den erkannten Text
- Optional: `barged_in` Flag (wenn Benutzer den Assistenten unterbrochen hat)

### 3. **Assistant Speak** (Output 3)
- Wird ausgelöst, wenn der Assistent zu sprechen beginnt
- Enthält Text/SSML, Dauer und Zeitstempel
- Nützlich für Metriken und Tracking

### 4. **Assistant Speech Ended** (Output 4)
- Wird ausgelöst, wenn der Assistent zu Ende gesprochen hat
- Markiert den Punkt, an dem das System auf Benutzereingaben wartet

### 5. **User Input Timeout** (Output 5)
- Wird ausgelöst, wenn keine Benutzereingabe innerhalb des Timeouts erkannt wurde
- Nützlich für Retry-Logik oder Eskalation

### 6. **Session End** (Output 6)
- Wird ausgelöst, wenn der Anruf endet
- Nur für Cleanup und Logging (keine Actions möglich)

## Konfiguration

### Authentication
- **None**: Keine Authentifizierung (nur für Tests!)
- **Header Auth**: Authentifizierung über HTTP Header (empfohlen)
  - **Header Name**: Name des Headers (Standard: `X-API-TOKEN`)
  - **Header Value**: Erwarteter Wert des Headers (wird als Shared Secret verwendet)

### Include Barge-In Flag
Wenn aktiviert, wird das `barged_in` Flag in `user_speak` Events eingeschlossen, das anzeigt, ob der Benutzer den Assistenten unterbrochen hat.

### Response Mode
- **No Response**: Gibt HTTP 204 (No Content) zurück
- **Return Last Node**: Gibt die Daten vom letzten Node im Workflow zurück (für Action-Responses)

## Verwendung

### Beispiel 1: Einfacher Echo Bot

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ HTTP Request → Speak: "Willkommen!"
│
└─ [Output 2: User Speak]
   └─ HTTP Request → Speak: "Du hast gesagt: {{$json.text}}"
```

### Beispiel 2: Komplexer Workflow mit verschiedenen Pfaden

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ Set Variable (conversation_context = {})
│     └─ HTTP Request → Speak: "Hallo! Wie kann ich helfen?"
│
├─ [Output 2: User Speak]
│  └─ Function (Extract intent from text)
│     ├─ IF (intent = "booking")
│     │  └─ HTTP Request → Speak: "Buchung wird bearbeitet..."
│     │
│     └─ IF (intent = "support")
│        └─ HTTP Request → Transfer to agent
│
├─ [Output 5: User Input Timeout]
│  └─ Function (Increment timeout counter)
│     └─ IF (counter >= 3)
│        ├─ True → HTTP Request → Hangup
│        └─ False → HTTP Request → Speak: "Bist du noch da?"
│
└─ [Output 6: Session End]
   └─ Database → Log conversation
```

### Beispiel 3: Barge-In Handling

```
AI Flow Trigger
└─ [Output 2: User Speak]
   └─ IF ({{$json.barged_in}} = true)
      ├─ True → HTTP Request → Speak: "Entschuldigung, bitte fahre fort"
      └─ False → Process normal speech
```

## Event Datenstruktur

Jedes Event enthält mindestens:

```json
{
  "eventType": "user_speak",
  "type": "user_speak",
  "text": "Benutzer hat gesagt...",
  "barged_in": false,
  "session": {
    "id": "uuid",
    "account_id": "account-123",
    "phone_number": "+491234567890",
    "direction": "inbound",
    "from_phone_number": "+499876543210",
    "to_phone_number": "+491234567890"
  }
}
```

## Actions zurücksenden

Um auf Events zu reagieren, verwende den "HTTP Request" Node mit "Response Mode: Return Last Node":

### Beispiel: Speak Action
```json
{
  "type": "speak",
  "session_id": "{{$json.session.id}}",
  "text": "Hallo! Wie kann ich Ihnen helfen?",
  "user_input_timeout_seconds": 8
}
```

### Beispiel: Transfer Action
```json
{
  "type": "transfer",
  "session_id": "{{$json.session.id}}",
  "target_phone_number": "+491234567890",
  "caller_id_name": "Support Team",
  "caller_id_number": "+491234567890"
}
```

### Beispiel: Hangup Action
```json
{
  "type": "hangup",
  "session_id": "{{$json.session.id}}"
}
```

## Sicherheit

- **Verwende immer Header Auth in Produktion**
- Generiere ein sicheres, zufälliges Token als Shared Secret
- Verwende HTTPS für die Webhook URL
- Validiere Event-Daten in deinem Workflow

## Workflow-Tipps

### Tipp 1: Verwende Set-Nodes für Session State
Da jeder Output ein eigener Pfad ist, verwende "Set" Nodes oder Variablen, um Session-State zu speichern.

### Tipp 2: Response Mode richtig einstellen
- Für passive Tracking (Assistant Speak, Session End): **No Response**
- Für aktive Responses (User Speak, Session Start): **Return Last Node**

### Tipp 3: Kombiniere Outputs
Du kannst mehrere Outputs zu einem gemeinsamen Node zusammenführen, wenn die Logik gleich ist:

```
AI Flow Trigger
├─ [Output 2: User Speak] ─┐
└─ [Output 5: Timeout]     ─┴─→ Gemeinsamer Handler
```

## Phase 2: Action Nodes (Geplant)

In Phase 2 werden wir dedizierte Action-Nodes hinzufügen:
- Speak Node
- Audio Node
- Transfer Node
- Hangup Node
- Barge-In Node

Diese ersetzen dann die manuellen HTTP Requests und machen Workflows noch einfacher.

## Ressourcen

- [sipgate AI Flow API Dokumentation](https://sipgate.github.io/sipgate-ai-flow-api/)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n Multiple Outputs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
