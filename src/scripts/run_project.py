import main

if not hasattr(main, "main") or not callable(main.main):
    raise SystemError("main.py does not have a function 'main' to run")

main.main()
