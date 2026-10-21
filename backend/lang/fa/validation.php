<?php

/**
 * پیام‌های اعتبارسنجی فارسی.
 *
 * بدون این فایل، Laravel پیام انگلیسی برمی‌گرداند و کاربر فارسی‌زبان خطای
 * «The phone field is required.» می‌بیند. کلیدهای استفاده‌شده در کنترلرها
 * اینجا ترجمه شده‌اند و بقیه به fallback انگلیسی برمی‌گردند.
 */
return [
    'required' => 'فیلد :attribute الزامی است.',
    'string' => ':attribute باید متن باشد.',
    'integer' => ':attribute باید عدد صحیح باشد.',
    'numeric' => ':attribute باید عدد باشد.',
    'boolean' => ':attribute باید بله یا خیر باشد.',
    'array' => ':attribute باید فهرست باشد.',
    'email' => ':attribute باید یک ایمیل معتبر باشد.',
    'exists' => ':attribute انتخاب‌شده معتبر نیست.',
    'unique' => 'این :attribute قبلاً ثبت شده است.',
    'in' => ':attribute انتخاب‌شده معتبر نیست.',
    'digits' => ':attribute باید :digits رقم باشد.',
    'regex' => 'قالب :attribute درست نیست.',

    'max' => [
        'array' => ':attribute نمی‌تواند بیش از :max مورد داشته باشد.',
        'file' => ':attribute نمی‌تواند بزرگ‌تر از :max کیلوبایت باشد.',
        'numeric' => ':attribute نمی‌تواند بیشتر از :max باشد.',
        'string' => ':attribute نمی‌تواند بیشتر از :max نویسه باشد.',
    ],

    'min' => [
        'array' => ':attribute باید حداقل :min مورد داشته باشد.',
        'file' => ':attribute باید حداقل :min کیلوبایت باشد.',
        'numeric' => ':attribute باید حداقل :min باشد.',
        'string' => ':attribute باید حداقل :min نویسه باشد.',
    ],

    'between' => [
        'array' => ':attribute باید بین :min و :max مورد داشته باشد.',
        'numeric' => ':attribute باید بین :min و :max باشد.',
        'string' => ':attribute باید بین :min و :max نویسه باشد.',
    ],

    'attributes' => [
        'phone' => 'شماره همراه',
        'code' => 'کد ورود',
        'email' => 'ایمیل',
        'name' => 'نام',
        'firstName' => 'نام',
        'lastName' => 'نام خانوادگی',
        'province' => 'استان',
        'city' => 'شهر',
        'line' => 'نشانی',
        'postalCode' => 'کد پستی',
        'note' => 'توضیح سفارش',
        'paymentMethod' => 'روش پرداخت',
        'shippingMethod' => 'روش ارسال',
        'couponCode' => 'کد تخفیف',
        'idempotencyKey' => 'کلید یکتای سفارش',
        'items' => 'اقلام سفارش',
        'items.*.slug' => 'نامک کالا',
        'items.*.quantity' => 'تعداد کالا',
        'rating' => 'امتیاز',
        'title' => 'عنوان',
        'body' => 'متن',
        'author' => 'نام نویسنده',
        'subject' => 'موضوع',
        'message' => 'متن پیام',
        'productSlug' => 'کالا',
        'orderNumber' => 'شماره سفارش',
        'coupon' => 'کد تخفیف',
    ],
];
