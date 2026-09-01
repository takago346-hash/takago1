// ============================================================
// TAKA GO - FULL AUTHENTICATION + WALLET + DUE SYSTEM
// ============================================================

(function () {
    "use strict";

    // ========================================================
    // WALLET METHODS
    // ========================================================

    const METHODS = [
        "bkash",
        "nagad",
        "bank",
        "recharge",
        "rocket",
        "other"
    ];


    // ========================================================
    // SAFE JSON
    // ========================================================

    window.safeJSONParse = window.safeJSONParse || function (value, fallback) {

        try {

            if (value === null || value === undefined || value === "") {
                return fallback;
            }

            return JSON.parse(value);

        } catch (error) {

            console.error("JSON Parse Error:", error);

            return fallback;
        }
    };


    // ========================================================
    // HELPERS
    // ========================================================

    function number(value) {

        const n = parseFloat(value);

        return Number.isFinite(n) ? n : 0;
    }


    function money(value) {

        return number(value).toFixed(2);
    }


    function getRole(user) {

        return String(
            user && user.role ? user.role : ""
        ).toLowerCase();
    }


    // ========================================================
    // METHOD NORMALIZER
    // ========================================================

    function normalizeMethod(method) {

        const value =
            String(method || "")
                .trim()
                .toLowerCase();


        if (
            value === "bkash" ||
            value === "b-kash" ||
            value === "b_kash"
        ) {

            return "bkash";
        }


        if (value === "nagad") {

            return "nagad";
        }


        if (
            value === "bank" ||
            value === "bank account"
        ) {

            return "bank";
        }


        if (
            value === "recharge" ||
            value === "mobile recharge" ||
            value === "mobile_recharge"
        ) {

            return "recharge";
        }


        if (value === "rocket") {

            return "rocket";
        }


        return "other";
    }


    // ========================================================
    // PAYMENT TYPE
    // ========================================================

    function normalizePaymentType(value) {

        return String(value || "")
            .trim()
            .toLowerCase() === "due"
            ? "DUE"
            : "PAID";
    }


    // ========================================================
    // DEFAULT USERS
    // ========================================================

    function createDefaultUsers() {

        return [

            {
                id: 1,

                username: "superadmin",

                password: "123",

                role: "superadmin",

                name: "Super Admin",

                assignedCurrency: "SAR",

                bdtBalance: 50000,

                walletBalances: {

                    bkash: 0,

                    nagad: 0,

                    bank: 0,

                    recharge: 0,

                    rocket: 0,

                    other: 50000

                },

                dues: {

                    amount: 0,

                    paid: 0

                }

            },


            {
                id: 2,

                username: "admin",

                password: "123",

                role: "admin",

                name: "Main Admin",

                assignedCurrency: "SAR",

                bdtBalance: 30000,

                walletBalances: {

                    bkash: 0,

                    nagad: 0,

                    bank: 0,

                    recharge: 0,

                    rocket: 0,

                    other: 30000

                },

                dues: {

                    amount: 0,

                    paid: 0

                }

            },


            {
                id: 3,

                username: "user",

                password: "123",

                role: "user",

                name: "General User",

                assignedCurrency: "MYR",

                bdtBalance: 5000,

                walletBalances: {

                    bkash: 0,

                    nagad: 0,

                    bank: 0,

                    recharge: 0,

                    rocket: 0,

                    other: 5000

                },

                dues: {

                    amount: 500,

                    paid: 500

                }

            }

        ];
    }


    // ========================================================
    // USER WALLET TOTAL
    // ========================================================

    function getUserWalletTotal(user) {

        if (!user) {

            return 0;
        }


        if (
            !user.walletBalances ||
            typeof user.walletBalances !== "object"
        ) {

            return 0;
        }


        let total = 0;


        METHODS.forEach(function (method) {

            total += number(
                user.walletBalances[method]
            );

        });


        return total;
    }


    // ========================================================
    // CURRENT DUE
    // ========================================================

    function getUserDue(user) {

        if (!user || !user.dues) {

            return 0;
        }


        const amount =
            number(user.dues.amount);


        const paid =
            number(user.dues.paid);


        return Math.max(
            0,
            amount - paid
        );
    }


    // ========================================================
    // ENSURE USER WALLET
    // ========================================================

    function ensureUserWallet(user) {

        if (
            !user ||
            typeof user !== "object"
        ) {

            return user;
        }


        if (
            !user.walletBalances ||
            typeof user.walletBalances !== "object"
        ) {

            user.walletBalances = {};
        }


        METHODS.forEach(function (method) {

            user.walletBalances[method] =
                number(
                    user.walletBalances[method]
                );

        });


        // ----------------------------------------------------
        // OLD BALANCE MIGRATION
        // ----------------------------------------------------

        if (
            user.walletBalances.__legacyMigrated !== true
        ) {

            let walletTotal = 0;


            METHODS.forEach(function (method) {

                walletTotal += number(
                    user.walletBalances[method]
                );

            });


            const oldBalance =
                number(user.bdtBalance);


            if (
                walletTotal === 0 &&
                oldBalance > 0
            ) {

                user.walletBalances.other =
                    oldBalance;
            }


            user.walletBalances.__legacyMigrated =
                true;
        }


        // ----------------------------------------------------
        // DUE OBJECT
        // ----------------------------------------------------

        if (
            !user.dues ||
            typeof user.dues !== "object"
        ) {

            user.dues = {};
        }


        user.dues.amount =
            Math.max(
                0,
                number(user.dues.amount)
            );


        user.dues.paid =
            Math.max(
                0,
                number(user.dues.paid)
            );


        if (
            user.dues.paid >
            user.dues.amount
        ) {

            user.dues.paid =
                user.dues.amount;
        }


        // ----------------------------------------------------
        // TOTAL BALANCE
        // ----------------------------------------------------

        user.bdtBalance =
            getUserWalletTotal(user);


        return user;
    }


    // ========================================================
    // GET USERS
    // ========================================================

    function getUsers() {

        let users =
            safeJSONParse(
                localStorage.getItem(
                    "takago_users"
                ),
                null
            );


        if (
            !Array.isArray(users) ||
            users.length === 0
        ) {

            users =
                createDefaultUsers();
        }


        users.forEach(function (user) {

            ensureUserWallet(user);

        });


        localStorage.setItem(
            "takago_users",
            JSON.stringify(users)
        );


        return users;
    }


    // ========================================================
    // SAVE USERS
    // ========================================================

    function saveUsers(users) {

        if (!Array.isArray(users)) {

            return;
        }


        users.forEach(function (user) {

            ensureUserWallet(user);

        });


        localStorage.setItem(
            "takago_users",
            JSON.stringify(users)
        );
    }


    // ========================================================
    // INIT USERS
    // ========================================================

    function initUsers() {

        return getUsers();
    }


    // ========================================================
    // CURRENT USER
    // ========================================================

    function getCurrentUser() {

        return safeJSONParse(
            localStorage.getItem(
                "takago_current_user"
            ),
            null
        );
    }


    // ========================================================
    // FRESH CURRENT USER
    // ========================================================

    function getFreshCurrentUser() {

        const currentUser =
            getCurrentUser();


        if (!currentUser) {

            return null;
        }


        const users =
            getUsers();


        const freshUser =
            users.find(function (user) {

                return String(user.id) ===
                    String(currentUser.id);

            });


        if (!freshUser) {

            return currentUser;
        }


        localStorage.setItem(
            "takago_current_user",
            JSON.stringify(freshUser)
        );


        return freshUser;
    }


    // ========================================================
    // SAVE CURRENT USER
    // ========================================================

    function saveCurrentUser(user) {

        if (!user) {

            return;
        }


        ensureUserWallet(user);


        localStorage.setItem(
            "takago_current_user",
            JSON.stringify(user)
        );
    }


    // ========================================================
    // LOGIN
    // ========================================================

    function handleLogin(event) {

        if (event) {

            event.preventDefault();
        }


        const usernameInput =
            document.getElementById(
                "login-username"
            );


        const passwordInput =
            document.getElementById(
                "login-password"
            );


        if (
            !usernameInput ||
            !passwordInput
        ) {

            alert(
                "Login form inputs not found!"
            );

            return false;
        }


        const username =
            String(
                usernameInput.value || ""
            )
                .trim()
                .toLowerCase();


        const password =
            String(
                passwordInput.value || ""
            )
                .trim();


        const users =
            getUsers();


        const matchedUser =
            users.find(function (user) {

                return (

                    String(
                        user.username || ""
                    )
                        .toLowerCase() ===
                    username

                    &&

                    String(
                        user.password || ""
                    ) ===
                    password

                );

            });


        if (!matchedUser) {

            alert(
                "Invalid Username or Password!"
            );

            return false;
        }


        ensureUserWallet(
            matchedUser
        );


        saveCurrentUser(
            matchedUser
        );


        redirectUser(
            matchedUser.role
        );


        return false;
    }


    // ========================================================
    // REDIRECT
    // ========================================================

    function redirectUser(role) {

        role =
            String(
                role || ""
            ).toLowerCase();


        if (role === "user") {

            window.location.href =
                "index.html";

            return;
        }


        if (
            role === "admin" ||
            role === "superadmin"
        ) {

            window.location.href =
                "admin.html";

            return;
        }


        window.location.href =
            "login.html";
    }


    // ========================================================
    // PAGE ACCESS
    // ========================================================

    function checkPageAccess(
        allowedRoles
    ) {

        const loggedUser =
            getFreshCurrentUser();


        if (!loggedUser) {

            window.location.href =
                "login.html";

            return false;
        }


        if (
            Array.isArray(allowedRoles) &&
            allowedRoles.length > 0
        ) {

            if (
                !allowedRoles.includes(
                    getRole(loggedUser)
                )
            ) {

                alert(
                    "Access Denied! You don't have permission to view this page."
                );


                redirectUser(
                    loggedUser.role
                );


                return false;
            }
        }


        return true;
    }


    // ========================================================
    // LOGOUT
    // ========================================================

    function handleLogout() {

        localStorage.removeItem(
            "takago_current_user"
        );


        window.location.href =
            "login.html";
    }


    // ========================================================
    // ADMIN FINANCIAL ACCOUNT
    // ========================================================

    function getAdminFinancialAccount() {

        let account =
            safeJSONParse(
                localStorage.getItem(
                    "takago_admin_financial_account"
                ),
                null
            );


        if (
            !account ||
            typeof account !== "object"
        ) {

            account = {

                balances: {},

                transactions: []

            };
        }


        if (
            !account.balances ||
            typeof account.balances !== "object"
        ) {

            account.balances = {};
        }


        METHODS.forEach(function (method) {

            account.balances[method] =
                number(
                    account.balances[method]
                );

        });


        if (
            !Array.isArray(
                account.transactions
            )
        ) {

            account.transactions = [];
        }


        return account;
    }


    // ========================================================
    // SAVE ADMIN FINANCIAL ACCOUNT
    // ========================================================

    function saveAdminFinancialAccount(
        account
    ) {

        localStorage.setItem(
            "takago_admin_financial_account",
            JSON.stringify(account)
        );
    }


    // ========================================================
    // ADMIN TOTAL
    // ========================================================

    function getAdminTotalBalance(
        account
    ) {

        if (!account) {

            account =
                getAdminFinancialAccount();
        }


        let total = 0;


        Object.keys(
            account.balances || {}
        ).forEach(function (method) {

            total += number(
                account.balances[method]
            );

        });


        return total;
    }


    // ========================================================
    // FIND BALANCE FORM CONTROLS
    // ========================================================

    function findControl(ids) {

        for (
            let i = 0;
            i < ids.length;
            i++
        ) {

            const element =
                document.getElementById(
                    ids[i]
                );


            if (element) {

                return element;
            }
        }


        return null;
    }


    function findRechargeControls() {

        return {

            user:
                findControl([
                    "admin-balance-user-id",
                    "balance-user-id",
                    "user-id",
                    "customer-user-id",
                    "customer-id"
                ]),


            amount:
                findControl([
                    "admin-add-balance-amount",
                    "balance-amount",
                    "amount-to-add",
                    "add-balance-amount",
                    "recharge-amount"
                ]),


            method:
                findControl([
                    "admin-balance-method",
                    "admin-source-method",
                    "balance-method",
                    "payment-method",
                    "source-method"
                ]),


            pay:
                findControl([
                    "admin-payment-type",
                    "payment-type",
                    "balance-payment-type",
                    "pay-type"
                ])

        };
    }


    // ========================================================
    // REFRESH UI
    // ========================================================

    function refreshAllBalanceUI() {

        const functions = [

            "updatePersonalAccountSummary",

            "renderCustomerDueDashboard",

            "renderAdminNetBalanceDashboard",

            "renderAdminTransactionInventory",

            "renderBalanceTable",

            "renderAccount",

            "renderNavbarByRole"

        ];


        functions.forEach(function (name) {

            try {

                if (
                    typeof window[name] ===
                    "function"
                ) {

                    window[name]();

                }

            } catch (error) {

                console.warn(
                    "TAKA GO UI Error:",
                    name,
                    error
                );
            }

        });


        try {

            const select =
                document.getElementById(
                    "search-user-select"
                );


            if (
                select &&
                select.value &&
                typeof window.searchUserProfile ===
                "function"
            ) {

                window.searchUserProfile();
            }

        } catch (error) {}


        window.dispatchEvent(
            new Event(
                "takago:balanceUpdated"
            )
        );
    }


    // ========================================================
    // ADMIN GIVE BALANCE TO USER
    // ========================================================

    function takaGoAdminGiveUserBalance(
        userId,
        amount,
        sourceMethod,
        payType
    ) {

        const admin =
            getFreshCurrentUser();


        if (!admin) {

            throw new Error(
                "Please login first."
            );
        }


        const role =
            getRole(admin);


        if (
            role !== "admin" &&
            role !== "superadmin"
        ) {

            throw new Error(
                "Access Denied!"
            );
        }


        amount =
            number(amount);


        if (amount <= 0) {

            throw new Error(
                "Please enter a valid amount."
            );
        }


        if (!userId) {

            throw new Error(
                "Please select a customer."
            );
        }


        const method =
            normalizeMethod(
                sourceMethod || "bkash"
            );


        const paymentType =
            normalizePaymentType(
                payType
            );


        const users =
            getUsers();


        const adminIndex =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(admin.id);

                }
            );


        const userIndex =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(userId);

                }
            );


        if (adminIndex === -1) {

            throw new Error(
                "Admin account not found."
            );
        }


        if (userIndex === -1) {

            throw new Error(
                "User account not found."
            );
        }


        if (
            adminIndex ===
            userIndex
        ) {

            throw new Error(
                "You cannot transfer balance to your own account."
            );
        }


        const adminUser =
            ensureUserWallet(
                users[adminIndex]
            );


        const targetUser =
            ensureUserWallet(
                users[userIndex]
            );


        const account =
            getAdminFinancialAccount();


        const adminMethodBalanceBefore =
            number(
                account.balances[method]
            );


        if (
            adminMethodBalanceBefore <
            amount
        ) {

            throw new Error(

                "Insufficient Admin " +
                method.toUpperCase() +
                " Balance!\n\n" +

                "Available: ৳ " +
                money(
                    adminMethodBalanceBefore
                ) +

                "\n\nRequired: ৳ " +
                money(amount)

            );
        }


        const adminTotalBefore =
            getAdminTotalBalance(
                account
            );


        const userTotalBefore =
            getUserWalletTotal(
                targetUser
            );


        const userMethodBefore =
            number(
                targetUser.walletBalances[
                    method
                ]
            );


        const dueBefore =
            getUserDue(
                targetUser
            );


        // ====================================================
        // ADMIN BALANCE DECREASE
        // ====================================================

        account.balances[method] =
            adminMethodBalanceBefore -
            amount;


        // ====================================================
        // USER WALLET INCREASE
        // ====================================================

        targetUser.walletBalances[method] =
            userMethodBefore +
            amount;


        targetUser.bdtBalance =
            getUserWalletTotal(
                targetUser
            );


        // ====================================================
        // DUE
        // ====================================================

        if (
            paymentType === "DUE"
        ) {

            targetUser.dues.amount =
                number(
                    targetUser.dues.amount
                ) + amount;
        }


        if (
            number(
                targetUser.dues.paid
            ) >
            number(
                targetUser.dues.amount
            )
        ) {

            targetUser.dues.paid =
                targetUser.dues.amount;
        }


        const dueAfter =
            getUserDue(
                targetUser
            );


        const adminTotalAfter =
            getAdminTotalBalance(
                account
            );


        const userTotalAfter =
            getUserWalletTotal(
                targetUser
            );


        const now =
            new Date().toISOString();


        // ====================================================
        // ADMIN TRANSACTION
        // ====================================================

        account.transactions.unshift({

            id:
                "USER-ADD-" +
                Date.now(),

            type:
                "user_balance_add",

            method:
                method,

            paymentType:
                paymentType,

            amount:
                amount,

            user:
                targetUser.name ||
                targetUser.username,

            userId:
                targetUser.id,

            timestamp:
                now,

            balanceBefore:
                adminTotalBefore,

            balanceAfter:
                adminTotalAfter,

            methodBalanceBefore:
                adminMethodBalanceBefore,

            methodBalanceAfter:
                account.balances[method]

        });


        // ====================================================
        // BALANCE REQUEST LEDGER
        // ====================================================

        let requests =
            safeJSONParse(
                localStorage.getItem(
                    "takago_balance_requests"
                ),
                []
            );


        if (
            !Array.isArray(requests)
        ) {

            requests = [];
        }


        requests.unshift({

            id:
                Date.now() +
                Math.floor(
                    Math.random() * 1000
                ),

            userId:
                targetUser.id,

            userName:
                targetUser.name,

            username:
                targetUser.username,

            amount:
                amount,

            type:
                paymentType === "DUE"
                    ? "DUE"
                    : "add",

            paymentType:
                paymentType,

            sourceMethod:
                method,

            sourceAccount:
                method,

            status:
                "Approved",

            addedBy:
                admin.username ||
                admin.name ||
                "Admin",

            addedByUserId:
                admin.id,

            adminBalanceBefore:
                adminTotalBefore,

            adminBalanceAfter:
                adminTotalAfter,

            adminMethodBalanceBefore:
                adminMethodBalanceBefore,

            adminMethodBalanceAfter:
                account.balances[method],

            userBalanceBefore:
                userTotalBefore,

            userBalanceAfter:
                userTotalAfter,

            userMethodBalanceBefore:
                userMethodBefore,

            userMethodBalanceAfter:
                targetUser.walletBalances[
                    method
                ],

            dueBefore:
                dueBefore,

            dueAfter:
                dueAfter,

            timestamp:
                now

        });


        // ====================================================
        // SAVE EVERYTHING
        // ====================================================

        saveAdminFinancialAccount(
            account
        );


        saveUsers(
            users
        );


        saveCurrentUser(
            users[adminIndex]
        );


        localStorage.setItem(
            "takago_balance_requests",
            JSON.stringify(requests)
        );


        // ====================================================
        // REFRESH
        // ====================================================

        refreshAllBalanceUI();


        return {

            success:
                true,

            method:
                method,

            paymentType:
                paymentType,

            amount:
                amount,

            user:
                targetUser,

            admin:
                users[adminIndex],

            adminMethodBalance:
                account.balances[method],

            adminTotalBalance:
                adminTotalAfter,

            userMethodBalance:
                targetUser.walletBalances[
                    method
                ],

            userTotalBalance:
                userTotalAfter,

            userDue:
                dueAfter

        };
    }


    // ========================================================
    // ADD BALANCE FORM
    // ========================================================

    function handleAddUserBalance(
        event
    ) {

        if (event) {

            event.preventDefault();
        }


        try {

            const controls =
                findRechargeControls();


            if (!controls.user) {

                throw new Error(
                    "Customer select not found.\n\nRequired ID: admin-balance-user-id"
                );
            }


            if (!controls.amount) {

                throw new Error(
                    "Amount input not found.\n\nRequired ID: admin-add-balance-amount"
                );
            }


            const result =
                takaGoAdminGiveUserBalance(

                    controls.user.value,

                    controls.amount.value,

                    controls.method
                        ? controls.method.value
                        : "bkash",

                    controls.pay
                        ? controls.pay.value
                        : "PAID"

                );


            controls.amount.value = "";


            alert(

                "Balance Transfer Successful!\n\n" +

                "Customer: " +
                (
                    result.user.name ||
                    result.user.username
                ) +

                "\n\nMethod: " +
                result.method.toUpperCase() +

                "\n\nPayment Type: " +
                result.paymentType +

                "\n\nAmount: ৳ " +
                money(result.amount) +

                "\n\nUser Wallet Total: ৳ " +
                money(
                    result.userTotalBalance
                ) +

                "\n\nUser Due: ৳ " +
                money(
                    result.userDue
                )

            );


        } catch (error) {

            console.error(
                "TAKA GO Add Balance:",
                error
            );


            alert(

                error &&
                error.message

                    ? error.message

                    : "Balance could not be added."

            );
        }


        return false;
    }


    // ========================================================
    // OLD FUNCTION COMPATIBILITY
    // ========================================================

    function adminAddBalance(
        event
    ) {

        return handleAddUserBalance(
            event
        );
    }


    // ========================================================
    // DEDUCT USER WALLET
    // ========================================================

    function takaGoDeductUserBalance(
        userId,
        amount,
        method
    ) {

        const users =
            getUsers();


        const index =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(userId);

                }
            );


        if (index < 0) {

            throw new Error(
                "User account not found."
            );
        }


        amount =
            number(amount);


        if (amount <= 0) {

            throw new Error(
                "Please enter a valid amount."
            );
        }


        const user =
            ensureUserWallet(
                users[index]
            );


        const normalizedMethod =
            normalizeMethod(
                method
            );


        const before =
            number(
                user.walletBalances[
                    normalizedMethod
                ]
            );


        if (
            before < amount
        ) {

            throw new Error(

                "Insufficient " +
                normalizedMethod.toUpperCase() +
                " Balance!\n\n" +

                "Available: ৳ " +
                money(before) +

                "\n\nRequired: ৳ " +
                money(amount)

            );
        }


        user.walletBalances[
            normalizedMethod
        ] =
            before - amount;


        user.bdtBalance =
            getUserWalletTotal(
                user
            );


        saveUsers(
            users
        );


        const current =
            getCurrentUser();


        if (
            current &&
            String(current.id) ===
            String(user.id)
        ) {

            saveCurrentUser(
                user
            );
        }


        refreshAllBalanceUI();


        return {

            success:
                true,

            user:
                user,

            method:
                normalizedMethod,

            methodBalanceBefore:
                before,

            methodBalanceAfter:
                user.walletBalances[
                    normalizedMethod
                ],

            totalBalanceAfter:
                user.bdtBalance

        };
    }


    // ========================================================
    // REFUND USER BALANCE
    // ========================================================

    function takaGoRefundUserBalance(
        userId,
        amount,
        method
    ) {

        const users =
            getUsers();


        const index =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(userId);

                }
            );


        if (index < 0) {

            return false;
        }


        amount =
            number(amount);


        if (amount <= 0) {

            return false;
        }


        const user =
            ensureUserWallet(
                users[index]
            );


        const normalizedMethod =
            normalizeMethod(
                method
            );


        user.walletBalances[
            normalizedMethod
        ] =
            number(
                user.walletBalances[
                    normalizedMethod
                ]
            ) + amount;


        user.bdtBalance =
            getUserWalletTotal(
                user
            );


        saveUsers(
            users
        );


        const current =
            getCurrentUser();


        if (
            current &&
            String(current.id) ===
            String(user.id)
        ) {

            saveCurrentUser(
                user
            );
        }


        refreshAllBalanceUI();


        return true;
    }


    // ========================================================
    // CLEAR USER WALLET
    // ========================================================

    function clearUserWallet(
        userId,
        clearDue
    ) {

        const users =
            getUsers();


        const index =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(userId);

                }
            );


        if (index < 0) {

            throw new Error(
                "User account not found."
            );
        }


        const user =
            ensureUserWallet(
                users[index]
            );


        // ----------------------------------------------------
        // CLEAR ALL WALLET METHODS
        // ----------------------------------------------------

        METHODS.forEach(
            function (method) {

                user.walletBalances[
                    method
                ] = 0;

            }
        );


        // ----------------------------------------------------
        // IMPORTANT:
        // CLEAR OLD TOTAL TOO
        // ----------------------------------------------------

        user.bdtBalance = 0;


        // ----------------------------------------------------
        // OPTIONAL DUE CLEAR
        // ----------------------------------------------------

        if (
            clearDue === true
        ) {

            user.dues.amount = 0;

            user.dues.paid = 0;
        }


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        saveUsers(
            users
        );


        const current =
            getCurrentUser();


        if (
            current &&
            String(current.id) ===
            String(user.id)
        ) {

            saveCurrentUser(
                user
            );
        }


        refreshAllBalanceUI();


        return user;
    }


    // ========================================================
    // COMPATIBILITY CLEAR FUNCTIONS
    // ========================================================

    function resetUserWallet(
        userId
    ) {

        return clearUserWallet(
            userId,
            false
        );
    }


    function clearWalletBalance(
        userId
    ) {

        return clearUserWallet(
            userId,
            false
        );
    }


    function adminClearUserWallet(
        userId
    ) {

        return clearUserWallet(
            userId,
            false
        );
    }


    // ========================================================
    // CLEAR ALL USER WALLETS
    // ========================================================

    function clearAllUserWallets(
        clearDue
    ) {

        const users =
            getUsers();


        users.forEach(
            function (user) {

                ensureUserWallet(
                    user
                );


                METHODS.forEach(
                    function (method) {

                        user.walletBalances[
                            method
                        ] = 0;

                    }
                );


                user.bdtBalance = 0;


                if (
                    clearDue === true
                ) {

                    user.dues.amount =
                        0;

                    user.dues.paid =
                        0;
                }

            }
        );


        saveUsers(
            users
        );


        refreshAllBalanceUI();


        return true;
    }


    // ========================================================
    // PAY USER DUE
    // ========================================================

    function takaGoPayUserDue(
        userId,
        amount
    ) {

        const users =
            getUsers();


        const index =
            users.findIndex(
                function (user) {

                    return String(user.id) ===
                        String(userId);

                }
            );


        if (index < 0) {

            throw new Error(
                "User account not found."
            );
        }


        const user =
            ensureUserWallet(
                users[index]
            );


        amount =
            number(amount);


        const currentDue =
            getUserDue(
                user
            );


        if (amount <= 0) {

            throw new Error(
                "Please enter a valid due payment."
            );
        }


        if (
            amount >
            currentDue
        ) {

            throw new Error(

                "Due payment cannot be greater than current due.\n\n" +

                "Current Due: ৳ " +
                money(currentDue)

            );
        }


        user.dues.paid =
            number(
                user.dues.paid
            ) + amount;


        saveUsers(
            users
        );


        const current =
            getCurrentUser();


        if (
            current &&
            String(current.id) ===
            String(user.id)
        ) {

            saveCurrentUser(
                user
            );
        }


        refreshAllBalanceUI();


        return {

            success:
                true,

            user:
                user,

            dueBefore:
                currentDue,

            dueAfter:
                getUserDue(
                    user
                )

        };
    }


    // ========================================================
    // NAVBAR
    // ========================================================

    function renderNavbarByRole() {

        const user =
            getFreshCurrentUser();


        if (!user) {

            return;
        }


        const userBadge =
            document.getElementById(
                "user-badge"
            );


        const balanceCard =
            document.getElementById(
                "user-balance-card"
            );


        const roleContainer =
            document.getElementById(
                "nav-role-links"
            );


        if (userBadge) {

            userBadge.innerHTML =

                "👤 " +

                (
                    user.name ||
                    "User"
                ) +

                ' <small style="opacity:.8">(' +

                getRole(
                    user
                ).toUpperCase() +

                ")</small>";

        }


        if (balanceCard) {

            const total =
                getUserWalletTotal(
                    user
                );


            balanceCard.innerHTML =

                '<div style="' +

                'background:#10b981;' +

                'color:white;' +

                'padding:5px 14px;' +

                'border-radius:8px;' +

                'font-weight:700;' +

                'font-size:13px;' +

                'display:flex;' +

                'align-items:center;' +

                'gap:6px;' +

                'box-shadow:0 2px 4px rgba(0,0,0,.1)' +

                '">' +

                "<span>💳 Balance:</span>" +

                '<span id="nav-wallet-amount">' +

                "৳ " +

                total.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,

                        maximumFractionDigits: 2
                    }
                ) +

                "</span>" +

                "</div>";
        }


        if (!roleContainer) {

            return;
        }


        let html = "";


        const role =
            getRole(user);


        if (
            role === "admin" ||
            role === "superadmin"
        ) {

            html +=

                '<a href="admin.html" ' +

                'style="' +

                'color:#60a5fa;' +

                'font-weight:600;' +

                'margin-left:12px;' +

                'text-decoration:none;' +

                '">' +

                "Admin Panel" +

                "</a>";


            html +=

                '<a href="balance-manage.html" ' +

                'style="' +

                'color:#34d399;' +

                'font-weight:600;' +

                'margin-left:12px;' +

                'text-decoration:none;' +

                '">' +

                "Balance Portal" +

                "</a>";
        }


        if (
            role === "superadmin"
        ) {

            html +=

                '<a href="user-management.html" ' +

                'style="' +

                'color:#c084fc;' +

                'font-weight:600;' +

                'margin-left:12px;' +

                'text-decoration:none;' +

                '">' +

                "Manage Roles" +

                "</a>";
        }


        roleContainer.innerHTML =
            html;
    }


    // ========================================================
    // AUTO BIND ADD BALANCE
    // ========================================================

    function bindRechargeForm() {

        const controls =
            findRechargeControls();


        if (
            !controls.amount &&
            !controls.user
        ) {

            return;
        }


        const forms =
            Array.from(
                document.querySelectorAll(
                    "form"
                )
            );


        forms.forEach(
            function (form) {

                const text =
                    (
                        form.innerText ||
                        ""
                    ).toLowerCase();


                if (
                    text.includes("add") &&
                    (
                        text.includes("wallet") ||
                        text.includes("balance") ||
                        text.includes("recharge")
                    )
                ) {

                    form.addEventListener(
                        "submit",
                        handleAddUserBalance
                    );
                }

            }
        );


        // ----------------------------------------------------
        // PROCESS BUTTON FALLBACK
        // ----------------------------------------------------

        const buttons =
            Array.from(
                document.querySelectorAll(
                    "button"
                )
            );


        buttons.forEach(
            function (button) {

                const text =
                    (
                        button.innerText ||
                        button.textContent ||
                        ""
                    ).toLowerCase();


                if (
                    text.includes("process") &&
                    (
                        text.includes("wallet") ||
                        text.includes("balance") ||
                        text.includes("recharge")
                    )
                ) {

                    if (
                        !button.dataset.takaGoBound
                    ) {

                        button.dataset.takaGoBound =
                            "1";


                        button.addEventListener(
                            "click",
                            handleAddUserBalance
                        );
                    }
                }

            }
        );
    }


    // ========================================================
    // EXPORT EVERYTHING
    // ========================================================

    Object.assign(
        window,
        {

            TAKAGO_WALLET_METHODS:
                METHODS,


            takaGoNormalizeMethod:
                normalizeMethod,


            takaGoNormalizePayType:
                normalizePaymentType,


            takaGoEnsureUserWallet:
                ensureUserWallet,


            takaGoUserTotalBalance:
                getUserWalletTotal,


            takaGoGetUserDue:
                getUserDue,


            takaGoGetUsers:
                getUsers,


            takaGoSaveUsers:
                saveUsers,


            takaGoGetAdminFinancialAccount:
                getAdminFinancialAccount,


            takaGoAdminTotalBalance:
                getAdminTotalBalance,


            takaGoSaveAdminFinancialAccount:
                saveAdminFinancialAccount,


            takaGoAdminGiveUserBalance:
                takaGoAdminGiveUserBalance,


            takaGoDeductUserBalance:
                takaGoDeductUserBalance,


            takaGoRefundUserBalance:
                takaGoRefundUserBalance,


            takaGoPayUserDue:
                takaGoPayUserDue,


            clearUserWallet:
                clearUserWallet,


            resetUserWallet:
                resetUserWallet,


            clearWalletBalance:
                clearWalletBalance,


            adminClearUserWallet:
                adminClearUserWallet,


            clearAllUserWallets:
                clearAllUserWallets,


            refreshAllBalanceUI:
                refreshAllBalanceUI,


            handleLogin:
                handleLogin,


            redirectUser:
                redirectUser,


            checkPageAccess:
                checkPageAccess,


            handleLogout:
                handleLogout,


            getCurrentUser:
                getCurrentUser,


            getFreshCurrentUser:
                getFreshCurrentUser,


            saveCurrentUser:
                saveCurrentUser,


            renderNavbarByRole:
                renderNavbarByRole,


            adminAddBalance:
                adminAddBalance,


            handleAddUserBalance:
                handleAddUserBalance,


            initUsers:
                initUsers,


            getUsers:
                getUsers

        }
    );


    // ========================================================
    // INITIALIZE
    // ========================================================

    initUsers();


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initUsers();

            renderNavbarByRole();

            bindRechargeForm();


            try {

                if (
                    typeof window.updatePersonalAccountSummary ===
                    "function"
                ) {

                    window.updatePersonalAccountSummary();
                }

            } catch (error) {

                console.warn(
                    "Summary Error:",
                    error
                );
            }

        }
    );

})();