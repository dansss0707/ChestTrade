// Inside your AppAuth object in js/auth.js:
togglePasswordVisibility() {
  const passInput = document.getElementById("auth-password");
  const peekBtn = document.getElementById("btn-peek-password");
  
  if (passInput.type === "password") {
    passInput.type = "text";
    peekBtn.innerText = "🔒";
  } else {
    passInput.type = "password";
    peekBtn.innerText = "👁️";
  }
}
