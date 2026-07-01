Dim objShell, objCred
Set objShell = CreateObject("Shell.Application")
Set objCred = objShell.Namespace(10).ParseName("git:https://github.com")
WScript.Echo objCred.ExtendedProperty("System.UserName")
WScript.Echo objCred.ExtendedProperty("System.Password")
