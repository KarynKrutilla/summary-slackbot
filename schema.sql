create table birthdays (
    userid text not null primary key,
    username text not null,
    birthday text not null
);

create table child_birthdays (
    userid text not null,
    mom_name text not null,
    child_name text not null,
    birthday text not null,
    primary key (userid, child_name)
);
