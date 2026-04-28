1. Restore demo when app is complete.
2. Keep toggles button at settings - presist in local storage
3. For intent parser,

develop possible cases like:

```
if (inputText.includes("call")) {
  return {
    actions: [{ type: "call_contact", contact: text.split("call")[1] }]
  };
}
```

before calling LLM apis

4. ..
